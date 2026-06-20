# Medical Chatbot — Project Skill

## Purpose
This skill enforces the architectural constraints of the Medical Chatbot. Loaded automatically when Claude Code works in this project directory, it ensures all code, suggestions, and changes respect the chosen stack.

## Tech Stack (Non-Negotiable)

### Backend
- **Framework:** FastAPI (Python 3.12+), NOT Flask, NOT Django.
- **HTTP Client:** `httpx` with async support for all outbound API calls.
- **LLM Runtime:** Ollama, running locally at `http://localhost:11434`, model `qwen2.5:7b`.
- **Streaming:** Server-Sent Events (SSE) over HTTP, NOT WebSockets.

### Frontend
- **Framework:** React with Next.js 16 (App Router) and TypeScript.
- **Styling:** Tailwind CSS.
- **Stream Consumption:** `fetch()` with `ReadableStream` to consume SSE from the FastAPI backend.

### Data Sources (Live APIs Only — No Keys Required)
- **Wikipedia MediaWiki:** `en.wikipedia.org/w/api.php` — raw query search (no suffix bias), plain-text extracts. Requires `User-Agent` header.
- **OpenFDA Drug Label:** `api.fda.gov/drug/label.json` — Rx + OTC field extraction, DailyMed URLs. No key.
- **RxNav/RxNorm:** Client exists at `rxnav_client.py` but is NOT wired in the pipeline (unwired 2026-06-18). Heuristic drug extraction from query + wiki text proved sufficient.
- **NO local databases, NO vector stores, NO ChromaDB, NO FAISS, NO SQLite for document storage.** All retrieval is live from the web.

### Pipeline (Generative — No Classifier, No Hardcoded Prompt)
```
User query (any medical question — accepted unconditionally)
  ↓
Wikipedia: search raw query → get extracts
  ↓ (fallback: search extracted drug names if no articles found)
Drug extraction: heuristic — capitalized words + lowercase 5-15 char words from query + Wiki text
  ↓
OpenFDA: concurrent drug label searches for extracted names
  ↓
Citation metadata: build citation list from Wiki articles + FDA results
  ↓
Minimal prompt: context + "answer helpfully, cite [[CITATION:N]], include disclaimer"
  ↓
Ollama qwen2.5:7b → SSE stream (token|citation|done|error|warning|info)
```

## Rules

### DO NOT suggest or use:
- Any local vector database (ChromaDB, FAISS, LanceDB, Milvus, Pinecone, Weaviate, Qdrant).
- Any embedded document store or offline RAG pipeline.
- Flask, Django, or any Python web framework other than FastAPI.
- Any frontend framework other than Next.js + React + Tailwind.
- Any cloud LLM APIs (OpenAI, Anthropic, Groq, Together). The model MUST be local via Ollama.
- WebSockets for streaming — use SSE only.
- **Hardcoded system prompts.** The pipeline builds a minimal, non-prescriptive prompt. The model decides how to answer.
- **Keyword classifiers or drug lists.** Drug names are extracted heuristically from text, not matched against fixed lists.

### ALWAYS use:
- `httpx.AsyncClient` for all outbound HTTP from the backend (shared via `_get_client()` helpers).
- SSE event types: `token`, `citation`, `done`, `error`, `warning`, `info`.
- Citation format: `[[CITATION:N]]` or `[[CITATION N]]` markers (both normalised to `[[CITATION:N]]`).
- Citation rendering: Source-labeled clickable tags — `[Wikipedia ↗]` (teal) and `[FDA ↗]` (amber) — rendered inline within the message text.
- Concurrent API calls via `asyncio.gather()` — Wikipedia and OpenFDA searches run in parallel.
- A medical disclaimer in every response.
- `PYTHONPATH=.` when running from the project root.
- `Retry-After` header parsing + exponential backoff for transient HTTP failures (via `retry.py`).

### Error Handling:
- Every external API call must have a timeout and catch `httpx.TimeoutException` and `httpx.ConnectError`.
- API clients must never crash the caller — return empty/fallback data on failure and log the error.
- SSE connections must never hang — always emit `event: error` on failure before closing.

### Code Organization:
- `backend/` — 10 Python modules (8 active + 1 standby + 1 init):
  - `main.py` — FastAPI server (SSE streaming route with try/except guard)
  - `symptom_pipeline.py` — self-contained pipeline (prompt building, drug extraction, context formatting, streaming — all inline)
  - `wiki_client.py` — Wikipedia MediaWiki API (raw query search + extracts, no suffix bias)
  - `openfda_client.py` — OpenFDA drug label API (OTC + Rx field extraction)
  - `config.py` — centralised configuration (endpoints, timeouts, model name, prompt limits)
  - `retry.py` — shared HTTP retry helper with Retry-After parsing
  - `session_store.py` — in-memory conversation history (6-turn window, 30-min TTL)
  - `logging_setup.py` — structured logging with request-ID injection via contextvar
  - `rxnav_client.py` — RxNorm drug name normalisation (UNWIRED — not called by pipeline, kept for reference)
  - `__init__.py`
- `frontend/` — Next.js 16 App Router + TypeScript + Tailwind CSS:
  - `hooks/` — `useChatController`, `useChatReducer` (12 actions), `useChatStream`, `useSessionStore`, `useScrollManager`
  - `components/` — `ChatContainer` (React.memo), `MessageList`, `MessageBubble`, `InlineCitation`, `CitationPill`, `Sidebar`, `SendButton`, `AutoExpandTextarea`, `EmptyState`, `StatusBubble`, `StreamingDots`, `ErrorBoundary`, `Icons`
  - `lib/` — `types.ts`, `constants.ts`, `utils.ts`
- `.claude/` — skills (`SKILL.md`), agents (`medical-rag-builder.md`), plan (`plan.md` — canonical project document)
