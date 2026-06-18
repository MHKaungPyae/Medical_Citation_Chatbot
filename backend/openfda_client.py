"""OpenFDA Drug Label API client.

Queries the `/drug/label` endpoint to retrieve structured drug safety data.
"""

from __future__ import annotations

import logging
import re
from html import unescape
from typing import Any
from urllib.parse import quote

import httpx

from backend.config import (
    OPENFDA_ENDPOINT,
    OPENFDA_TIMEOUT,
    OPENFDA_MAX_RETRIES,
    OPENFDA_RETRY_DELAY,
)
from backend.retry import retry_get

logger = logging.getLogger(__name__)

# ── helpers ───────────────────────────────────────────────────────────────

def _clean_text(text: str | None) -> str:
    if not text:
        return ""
    cleaned = re.sub(r"<[^>]+>", " ", text)
    cleaned = unescape(cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


def _truncate(text: str, max_words: int) -> str:
    if not text:
        return ""
    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words]) + " …"


def _extract_field(results: list[dict[str, Any]], field: str) -> str:
    """Extract and clean a string field from the first result that has it."""
    try:
        for result in results:
            value = result.get(field)
            if isinstance(value, list) and value:
                return _clean_text(value[0])
            if isinstance(value, str) and value.strip():
                return _clean_text(value)
    except (IndexError, TypeError):
        pass
    return ""


def _extract_spl_id(results: list[dict[str, Any]]) -> str:
    """Extract the SPL (Structured Product Label) set_id for DailyMed link."""
    try:
        for result in results:
            spl_id = result.get("set_id")
            if spl_id and isinstance(spl_id, str) and spl_id.strip():
                return spl_id.strip()
    except (IndexError, TypeError):
        pass
    return ""


def _not_found(drug_name: str) -> dict[str, Any]:
    return {
        "drug_name": drug_name,
        "not_found": True,
        "message": "No FDA label data found for this drug.",
    }


# ── public API ────────────────────────────────────────────────────────────

async def search_openfda(drug_name: str) -> dict[str, Any]:
    """Query the OpenFDA drug label endpoint and return structured data.

    Searches across brand name, generic name, and substance name fields
    for the broadest coverage.
    """
    search = (
        f"openfda.brand_name:{quote(drug_name)}"
        f"+openfda.generic_name:{quote(drug_name)}"
        f"+openfda.substance_name:{quote(drug_name)}"
    )
    url = f"{OPENFDA_ENDPOINT}?search={search}&limit=1"
    source_url = url   # may be upgraded to a DailyMed link below

    async with httpx.AsyncClient(timeout=OPENFDA_TIMEOUT) as client:
        try:
            response = await retry_get(
                client, url,
                label=f"OpenFDA({drug_name!r})",
                max_retries=OPENFDA_MAX_RETRIES,
                delay=OPENFDA_RETRY_DELAY,
            )
            data = response.json()
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code not in (429, 502, 503, 504):
                logger.warning(
                    "OpenFDA HTTP %d for drug=%r",
                    exc.response.status_code, drug_name,
                )
                return _not_found(drug_name)
            # Transient errors (429/5xx) — retry_get already exhausted retries
            logger.warning("OpenFDA exhausted retries for drug=%r", drug_name)
            return _not_found(drug_name)
        except (httpx.TimeoutException, httpx.ConnectError, ValueError, Exception) as exc:
            logger.warning("OpenFDA failed for drug=%r: %s", drug_name, exc)
            return _not_found(drug_name)

    results: list[dict[str, Any]] = data.get("results", [])
    if not results:
        logger.info("OpenFDA returned zero results for drug=%r", drug_name)
        return _not_found(drug_name)

    # ── extract Rx fields (prescription labels) ─────────────────────────
    rx_warnings = _extract_field(results, "warnings_and_cautions")
    rx_adverse = _extract_field(results, "adverse_reactions")
    rx_contraindications = _extract_field(results, "contraindications")
    rx_interactions = _extract_field(results, "drug_interactions")
    boxed = _extract_field(results, "boxed_warning")
    indications = _extract_field(results, "indications_and_usage")
    dosage = _extract_field(results, "dosage_and_administration")

    # ── extract OTC fields (Drug Facts labels) ──────────────────────────
    otc_warnings = _extract_field(results, "warnings")
    otc_do_not_use = _extract_field(results, "do_not_use")
    otc_stop_use = _extract_field(results, "stop_use")
    otc_ask_doctor = _extract_field(results, "ask_doctor")
    otc_ask_pharmacist = _extract_field(results, "ask_doctor_or_pharmacist")
    otc_pregnancy = _extract_field(results, "pregnancy_or_breast_feeding")

    # ── merge Rx + OTC ─────────────────────────────────────────────────
    # Warnings: Rx warnings_and_cautions, fallback to OTC "warnings" field
    warnings = rx_warnings or otc_warnings

    if boxed:
        warnings = f"BOXED WARNING: {boxed}   {warnings}".rstrip()

    # Side effects: Rx adverse_reactions, OTC do_not_use + stop_use
    if rx_adverse:
        side_effects = rx_adverse
    else:
        side_parts = []
        if otc_do_not_use:
            side_parts.append(f"Do not use: {otc_do_not_use}")
        if otc_stop_use:
            side_parts.append(f"Stop use: {otc_stop_use}")
        side_effects = " | ".join(side_parts) if side_parts else ""

    # Contraindications: Rx or OTC ask-doctor fields
    if rx_contraindications:
        contraindications = rx_contraindications
    else:
        ci_parts = []
        if otc_ask_doctor:
            ci_parts.append(f"Before use ask doctor: {otc_ask_doctor}")
        if otc_ask_pharmacist:
            ci_parts.append(f"Also ask pharmacist: {otc_ask_pharmacist}")
        contraindications = " | ".join(ci_parts) if ci_parts else ""

    # Interactions: Rx only (OTC labels don't have drug_interactions)
    drug_interactions = rx_interactions

    # Build a better URL — prefer DailyMed when SPL id is available
    spl_id = _extract_spl_id(results)
    if spl_id:
        source_url = (
            f"https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid={spl_id}"
        )

    return {
        "drug_name": drug_name,
        "indications": _truncate(indications, 150),
        "warnings": _truncate(warnings, 200),
        "side_effects": _truncate(side_effects, 200),
        "contraindications": _truncate(contraindications, 150),
        "drug_interactions": _truncate(drug_interactions, 150),
        "dosage": _truncate(dosage, 150),
        "pregnancy": _truncate(otc_pregnancy, 150),
        "source_url": source_url,
    }
