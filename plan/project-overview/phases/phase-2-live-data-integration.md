# Phase 2: Live Medical Data Integration

**Status:** ✅ Complete

## Goal
Integrate Wikipedia and OpenFDA APIs for live medical data retrieval.

## What Was Done
- Built Wikipedia MediaWiki client (`wiki_client.py`) — raw query search + plain-text extracts
- Built OpenFDA drug label client (`openfda_client.py`) — Rx + OTC field extraction, DailyMed URLs
- Built RxNav/RxNorm client (`rxnav_client.py`) — later unwired (heuristic extraction sufficient)
- Built query classifier (`query_classifier.py`) — later deleted (all queries now accepted)
- Shared HTTP retry helper (`retry.py`) with Retry-After parsing and exponential backoff
- All API calls have timeouts, error handling returns empty/fallback data (never crashes caller)

## Files Created
- `backend/wiki_client.py`
- `backend/openfda_client.py`
- `backend/rxnav_client.py` (unwired)
- `backend/retry.py`
- `backend/session_store.py`

## Files Later Deleted
- `pubmed_client.py` — poor relevance, XML overhead, API key required
- `semantic_scholar_client.py` — severe 429 rate limiting
- `query_classifier.py` — replaced by heuristic drug extraction
- `classifier_data.py` — keyword lists no longer needed
