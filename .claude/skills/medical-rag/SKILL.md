---
name: medical-rag
description: Enforces the architectural constraints of the Medical Citation Chatbot — FastAPI backend, Next.js frontend, Ollama LLM, SSE streaming, live web retrieval only.
---
<!-- vibekit:pack=core-vibe-coder -->

# Medical Chatbot — Project Skill

## Purpose
This skill enforces the architectural constraints of the Medical Chatbot. Loaded automatically when Claude Code works in this project directory, it ensures all code, suggestions, and changes respect the chosen stack.

## Tech Stack (Non-Negotiable)

### Backend
- **Framework:** FastAPI (Python 3.12+), NOT Flask, NOT Django.
- **HTTP Client:** `httpx` with async support for all outbound API calls.
- **LLM Runtime:** Ollama, running locally at `http://localhost:11434`, model `medgemma1.5:4b-it-q8_0`.
- **Streaming:** Server-Sent Events (SSE) over HTTP, NOT WebSockets.

### Frontend
- **Framework:** React with Next.js 16 (App Router) and TypeScript.
- **Styling:** Tailwind CSS.
- **Stream Consumption:** `fetch()` with `ReadableStream` to consume SSE from the FastAPI backend.

### Data Sources (Live APIs Only)
- **Wikipedia MediaWiki:** `en.wikipedia.org/w/api.php` — raw query search (no suffix bias), plain-text extracts. Requires `User-Agent` header.
- **OpenFDA Drug Label:** `api.fda.gov/drug/label.json` — Rx + OTC field extraction, DailyMed URLs. No key.
- **RxNav/RxNorm:** Client was deleted — heuristic drug extraction from query + wiki text proved sufficient.
- **Supabase:** Hosted PostgreSQL for session/message persistence + Supabase Auth for JWT-based authentication. No local database.
- **NO vector stores, NO ChromaDB, NO FAISS.** All retrieval is live from the web.

### Pipeline (Retrieve-Then-Generate — No Classifier, No Hardcoded Prompt)
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
Ollama medgemma1.5:4b-it-q8_0 → SSE stream (token|citation|done|error|warning|info)
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
- `authenticatedFetch` (from `frontend/lib/api.ts`) for all frontend→backend API calls — injects Supabase JWT.
- Supabase Auth for user authentication — local JWT verification via python-jose in backend (`auth.py`), auth guard on frontend pages.
- `load_dotenv()` in `config.py` to load `backend/.env` — never hardcode credentials.

### Error Handling:
- Every external API call must have a timeout and catch `httpx.TimeoutException` and `httpx.ConnectError`.
- API clients must never crash the caller — return empty/fallback data on failure and log the error.
- SSE connections must never hang — always emit `event: error` on failure before closing.

### Code Organization:
- `backend/` — 12 Python modules (11 active + 1 init):
  - `main.py` — FastAPI server (SSE streaming route, session router, shutdown hooks)
  - `symptom_pipeline.py` — self-contained pipeline (prompt building, drug extraction, context formatting, streaming — all inline)
  - `wiki_client.py` — Wikipedia MediaWiki API (raw query search + extracts, no suffix bias)
  - `openfda_client.py` — OpenFDA drug label API (OTC + Rx field extraction)
  - `config.py` — centralised configuration (endpoints, timeouts, model name, prompt limits, `load_dotenv`)
  - `retry.py` — shared HTTP retry helper with Retry-After parsing
  - `session_store.py` — Supabase-backed session/message persistence
  - `auth.py` — JWT verification middleware (`python-jose`), `get_current_user` FastAPI dependency
  - `routers/session_routes.py` — session CRUD API (GET/POST/PATCH/DELETE), auth-protected with ownership checks
  - `supabase_client.py` — Supabase client singleton (uses env vars)
  - `logging_setup.py` — structured logging with request-ID injection via contextvar
  - `__init__.py`
- `frontend/` — Next.js 16 App Router + TypeScript + Tailwind CSS:
  - `hooks/` — `useChatController`, `useChatReducer` (13 actions), `useChatStream`, `useSessionStore`, `useScrollManager`, `useAuth`
  - `components/` — `ChatContainer` (React.memo), `MessageList`, `MessageBubble`, `InlineCitation`, `CitationPill`, `Sidebar`, `SendButton`, `AutoExpandTextarea`, `EmptyState`, `StatusBubble`, `StreamingDots`, `ErrorBoundary`, `Icons`, `AuthProvider`, `AuthCard`, `AuthInput`, `AuthButton`
  - `components/ui/` — `liquid-glass-button` (glassmorphism button, Radix Slot + CVA), `shader-background` (WebGL animated canvas)
  - `lib/` — `types.ts`, `constants.ts`, `utils.ts`, `supabase.ts`, `api.ts`
  - `app/login/` — login page
  - `app/register/` — register page
- `.claude/` — skills (`SKILL.md`), agents (`medical-rag-builder.md`)
- `plan/` — project overview + phase plans (`plan/project-overview/`)
