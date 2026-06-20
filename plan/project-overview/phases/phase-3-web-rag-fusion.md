# Phase 3: Web RAG Fusion

**Status:** ✅ Complete

## Goal
Assemble the full pipeline: query → Wikipedia → drug extraction → OpenFDA → prompt → stream → persist.

## What Was Done
- Built `symptom_pipeline.py` — self-contained pipeline with all formatting inline
- Heuristic drug name extraction (3-pass: capitalized, all-caps, lowercase 4-15 char)
- Minimal prompt building (`_build_prompt()`) — context + "answer helpfully, cite sources, include disclaimer"
- Citation post-processing: normalise `[N]`, `(N)`, `[[CITATION N]]` → `[[CITATION:N]]`
- In-memory session store (6-turn window, 30-min TTL)
- Shared Ollama `httpx.AsyncClient` with shutdown hook
- Concurrent OpenFDA searches via `asyncio.gather()`
- Set-based Wikipedia dedup
- `MAX_OUTPUT_TOKENS` cap (4000)
- Prompt injection boundary markers

## Files Created
- `backend/symptom_pipeline.py`

## Files Modified
- `backend/wiki_client.py` — shared client, close_client()
- `backend/openfda_client.py` — shared client, drug_interactions in context
- `backend/session_store.py` — async interface
- `backend/config.py` — MAX_OUTPUT_TOKENS, ErrorCode class
