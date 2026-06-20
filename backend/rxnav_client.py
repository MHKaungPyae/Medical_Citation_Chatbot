"""RxNav / RxNorm client — NIH drug terminology API.

Normalises drug names and looks up brand/generic alternatives.
Free. No API key required.  REST API at rxnav.nlm.nih.gov.
"""

from __future__ import annotations

import logging
from typing import Any
from urllib.parse import quote

import httpx

from backend.retry import retry_get

# Constants local to this module (unwired — kept for reference)
RXNAV_BASE = "https://rxnav.nlm.nih.gov/REST"
RXNAV_TIMEOUT = httpx.Timeout(10.0, connect=5.0)

logger = logging.getLogger(__name__)


async def find_rxcui(drug_name: str) -> str | None:
    """Resolve a drug name to its RxCUI (RxNorm Concept Unique Identifier).

    Returns the RxCUI string, or ``None`` if the drug is not recognised.
    """
    name = drug_name.strip()
    if not name:
        return None

    url = f"{RXNAV_BASE}/rxcui?name={quote(name)}&allsrc=0"
    headers = {"Accept": "application/json"}
    async with httpx.AsyncClient(timeout=RXNAV_TIMEOUT, headers=headers) as client:
        try:
            response = await retry_get(
                client, url,
                label=f"RxNav(find {name!r})",
                max_retries=2,
                delay=1.0,
            )
            data = response.json()
        except (ValueError, httpx.HTTPError) as exc:
            logger.warning("RxNav rxcui lookup failed for %r: %s", name, exc)
            return None

    id_group = data.get("idGroup", {})
    rxnorm_ids = id_group.get("rxnormId", [])
    if rxnorm_ids and isinstance(rxnorm_ids[0], str):
        rxcui = rxnorm_ids[0]
        logger.info("RxNav: %r → RxCUI %s", name, rxcui)
        return rxcui
    return None


async def get_brand_names(drug_name: str) -> list[str]:
    """Get brand (trade) names for a drug.

    Accepts a generic or brand name → returns all known brand names.
    Returns an empty list if the drug is not found.
    """
    rxcui = await find_rxcui(drug_name)
    if not rxcui:
        return []
    return await _get_brands_for_rxcui(rxcui, drug_name)


async def _get_brands_for_rxcui(rxcui: str, drug_name: str) -> list[str]:
    """Fetch brand names for a known RxCUI (avoids double find_rxcui call)."""
    url = f"{RXNAV_BASE}/rxcui/{rxcui}/related?tty=BN+SBD"
    headers = {"Accept": "application/json"}
    async with httpx.AsyncClient(timeout=RXNAV_TIMEOUT, headers=headers) as client:
        try:
            response = await retry_get(
                client, url,
                label=f"RxNav(brands {drug_name!r})",
                max_retries=2,
                delay=1.0,
            )
            data = response.json()
        except (ValueError, httpx.HTTPError) as exc:
            logger.warning("RxNav related failed for %r: %s", drug_name, exc)
            return []

    groups = data.get("relatedGroup", {}).get("conceptGroup", [])
    brands: list[str] = []
    for group in groups:
        props = group.get("conceptProperties", [])
        for prop in props:
            name = prop.get("name", "")
            if name and name.lower() != drug_name.lower():
                brands.append(name)

    if brands:
        logger.info("RxNav: %s brand names for %r", len(brands), drug_name)
    return brands


async def get_drug_info(drug_name: str) -> dict[str, Any]:
    """Look up a drug by name and return simple metadata.

    Returns a dict with ``rxcui``, ``brand_names``, and ``original_name``.
    ``rxcui`` is ``None`` if the drug was not found.
    """
    rxcui = await find_rxcui(drug_name)
    brands = await _get_brands_for_rxcui(rxcui, drug_name) if rxcui else []

    return {
        "original_name": drug_name.strip(),
        "rxcui": rxcui,
        "brand_names": brands,
        "is_recognized": rxcui is not None,
    }
