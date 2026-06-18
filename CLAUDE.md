@.claude/skills/medical-rag/SKILL.md

# Project: Medical Chatbot (Symptom → Medication)

## Quickstart

```bash
# Backend
cd backend
source .venv/bin/activate
pip install -r requirements.txt
ollama pull qwen2.5:7b
cd .. && PYTHONPATH=. uvicorn backend.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

## Architecture

```
User → Next.js (port 3000) → FastAPI (port 8000) → Wikipedia / OpenFDA / RxNav / Ollama
                                   ↑
                          SSE streaming (token, citation, done, error, warning)
```

### Pipeline Flow

```
User query ("I have a headache and fever, what can I take?")
  ↓
Classify (drug? condition? both? non-medical?)
  ↓
Phase 1 (concurrent):
  ├── Wikipedia Medical: search for condition + treatment info
  └── OpenFDA: if drugs extracted, get FDA labels (OTC + Rx fields)
  ↓
Phase 2: RxNav normalises drug names → brand/generic alternatives
  ↓
Assemble prompt with wiki extracts + FDA labels + disclaimer instruction
  ↓
qwen2.5:7b streams response token-by-token via SSE
  ↓
Citation post-processing: normalise markers + filter unused citations
```

## Key Files

| File | Purpose |
|------|---------|
| `backend/main.py` | FastAPI server, POST /api/chat dispatch |
| `backend/symptom_pipeline.py` | Full pipeline: classify → wiki → OpenFDA → RxNav → prompt → LLM → citations |
| `backend/wiki_client.py` | MediaWiki API: search medical articles, get plain-text extracts |
| `backend/openfda_client.py` | OpenFDA drug/label API, OTC + Rx field extraction, DailyMed links |
| `backend/rxnav_client.py` | RxNorm API: drug name → RxCUI, brand name lookup |
| `backend/prompts.py` | System prompt (symptom→medicine), RAG prompt builder, context formatters |
| `backend/query_classifier.py` | Keyword-based query classification, drug name extraction |
| `backend/classifier_data.py` | 589 drug keywords + 440 medical condition keywords |
| `backend/config.py` | Centralised config: all endpoints, timeouts, model name |
| `backend/retry.py` | Shared HTTP retry with Retry-After parsing, exponential backoff |
| `backend/session_store.py` | In-memory conversation history (6-turn window, 30-min TTL) |
| `backend/logging_setup.py` | Structured logging with request-ID via context var |
| `frontend/app/page.tsx` | Main page wiring all components |
| `frontend/hooks/useChatController.ts` | Single hook: reducer + stream + session store + handlers |
| `frontend/hooks/useChatStream.ts` | SSE consumer (fetch + ReadableStream) |
| `frontend/hooks/useChatReducer.ts` | 12-action useReducer for chat state |
| `frontend/components/MessageBubble.tsx` | Renders text with inline clickable citation superscripts |
| `frontend/components/InlineCitation.tsx` | Parses [[CITATION:N]] → clickable superscript links |
| `frontend/components/CitationPill.tsx` | Rich citation pills (title, authors, year, journal, source icon) |

## Conventions

- **Imports:** Backend uses absolute imports (`from backend.wiki_client import …`). Always run from project root with `PYTHONPATH=.`.
- **Error handling:** API clients return empty/fallback data on failure — never crash the caller. External calls always have timeouts.
- **Citation format:** `[[CITATION:N]]` markers. Backend normalises bracket variants + space variants (`[[CITATION N]]`). Frontend renders as clickable superscript badges.
- **Concurrency:** Wikipedia + OpenFDA searches run via `asyncio.create_task()` in parallel. Multi-drug OpenFDA searches also run concurrently.
- **Streaming:** `_stream_ollama()` yields `(event_type, data_dict)` tuples — the caller serialises to SSE so full_text can be tracked without re-parsing.
- **Logging:** Structured with `[request_id]` column via context var. Every `logger.info/warning` call is traceable.
- **Pycache:** Always run `find backend -type d -name __pycache__ -exec rm -rf {} +` after code changes before restarting uvicorn — stale bytecode is a common trap.
- **Python deps:** Always activate the venv (`source backend/.venv/bin/activate`) before running tests or the server.
