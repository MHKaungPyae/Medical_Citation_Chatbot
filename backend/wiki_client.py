"""Wikipedia Medical knowledge client via the MediaWiki API.

Searches Wikipedia for medical articles about conditions, symptoms, and
treatments — then returns plain-text extracts for prompt assembly.

Free. No API key required.
"""

from __future__ import annotations

import logging
import re as _re
from typing import Any
from urllib.parse import quote, urlencode

import httpx

from backend.config import WIKI_ENDPOINT, WIKI_TIMEOUT, WIKI_SEARCH_LIMIT, WIKI_EXTRACT_CHARS
from backend.retry import retry_get

logger = logging.getLogger(__name__)

_USER_AGENT = "MedicalCitationChatbot/1.0 (https://github.com/example/medical-chatbot)"
_shared_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    """Return a shared httpx.AsyncClient with the required User-Agent header."""
    global _shared_client
    if _shared_client is None:
        _shared_client = httpx.AsyncClient(
            timeout=WIKI_TIMEOUT,
            headers={"User-Agent": _USER_AGENT},
        )
    return _shared_client


async def close_client() -> None:
    """Close the shared client. Call on app shutdown."""
    global _shared_client
    if _shared_client is not None:
        await _shared_client.aclose()
        _shared_client = None


async def search_wikipedia(query: str, max_results: int = WIKI_SEARCH_LIMIT) -> list[dict[str, Any]]:
    """Search Wikipedia for articles relevant to *query*.

    Returns a list of ``{pageid, title, snippet, url}`` dicts.
    Never raises — logs warnings and returns empty list on failure.
    """
    if not query.strip():
        return []

    search_term = query.strip()
    encoded = quote(search_term)

    url = (
        f"{WIKI_ENDPOINT}"
        f"?action=query"
        f"&list=search"
        f"&srsearch={encoded}"
        f"&srlimit={max_results}"
        f"&srprop=snippet"
        f"&format=json"
    )

    client = _get_client()
    try:
        response = await retry_get(
            client, url,
            label=f"Wiki(search {search_term!r})",
            max_retries=2,
            delay=1.0,
        )
        data = response.json()
    except (ValueError, httpx.HTTPError) as exc:
        logger.warning("Wikipedia search failed for %r: %s", search_term, exc)
        return []

    results = data.get("query", {}).get("search", [])
    if not results:
        return []

    articles: list[dict[str, Any]] = []
    for r in results:
        pageid = r.get("pageid", 0)
        title = (r.get("title") or "").strip()
        if not title:
            continue
        articles.append({
            "pageid": pageid,
            "title": title,
            "snippet": _clean_snippet(r.get("snippet", "")),
            "url": f"https://en.wikipedia.org/wiki/{quote(title.replace(' ', '_'))}",
        })

    logger.info("Wikipedia search %r → %d articles", search_term, len(articles))
    return articles


async def get_wiki_extracts(page_ids: list[int], chars: int = WIKI_EXTRACT_CHARS) -> dict[int, str]:
    """Fetch plain-text intro extracts for one or more Wikipedia page IDs.

    Returns a ``{pageid: extract_text}`` mapping.
    """
    if not page_ids:
        return {}

    ids_str = "|".join(str(pid) for pid in page_ids)
    params = {
        "action": "query",
        "prop": "extracts",
        "exintro": "1",
        "explaintext": "1",
        "exchars": str(chars),
        "pageids": ids_str,
        "format": "json",
    }
    url = f"{WIKI_ENDPOINT}?{urlencode(params)}"

    client = _get_client()
    try:
        response = await retry_get(
            client, url,
            label=f"Wiki(extracts {ids_str[:50]})",
            max_retries=2,
            delay=1.0,
        )
        data = response.json()
    except (ValueError, httpx.HTTPError) as exc:
        logger.warning("Wikipedia extracts failed: %s", exc)
        return {}

    pages = data.get("query", {}).get("pages", {})
    extracts: dict[int, str] = {}
    for pid_str, page in pages.items():
        pid = int(pid_str)
        text = (page.get("extract") or "").strip()
        if text:
            extracts[pid] = text

    return extracts


def _clean_snippet(snippet: str) -> str:
    """Strip HTML tags from Wikipedia search snippets."""
    return _re.sub(r"<[^>]+>", "", snippet).strip()
