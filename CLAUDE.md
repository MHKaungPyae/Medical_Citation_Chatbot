@.claude/skills/medical-rag/SKILL.md

# Project: Medical Chatbot (Generative RAG)

## Quickstart

```bash
# Backend
cd backend
source .venv/bin/activate
pip install -r requirements.txt
ollama pull medgemma1.5:4b-it-q8_0
cd .. && find backend -type d -name __pycache__ -exec rm -rf {} + && PYTHONPATH=. uvicorn backend.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

## Architecture

```
User → Next.js (port 3000) → FastAPI (port 8000) → Wikipedia / OpenFDA / Ollama
                ↕                       ↕
          Supabase Auth          Supabase PostgreSQL
          (JWT tokens)           (sessions + messages)
                                   ↑
                          SSE: token | citation | done | error | warning | info
```

### Pipeline Flow (Retrieve-Then-Generate)

```
User query (any medical question — accepted unconditionally)
  ↓
Phase 1: Wikipedia — search raw query, get extracts
  ↓ (fallback: search extracted drug names if no articles found)
Phase 2: Heuristic drug name extraction (capitalized + 5-15 char lowercase, minus stop words)
  ↓
Phase 3: OpenFDA — concurrent drug label searches for extracted names
  ↓
Phase 4: Citation metadata — build citation list from Wiki + FDA results
  ↓
Phase 5: Build minimal prompt (context + "answer helpfully, cite [[CITATION:N]], include disclaimer")
  ↓
Phase 6: Stream — citation metadata → info/warning → medgemma1.5:4b-it-q8_0 token stream
  ↓
Phase 7: Persist conversation to session store
  ↓
Citation post-processing: normalise markers → filter used citations → done event
```

## Key Files

| File | Purpose |
|------|---------|
| `backend/symptom_pipeline.py` | Self-contained pipeline: wiki → drug extract → OpenFDA → prompt → LLM → citations (all formatting inline, no prompts.py) |
| `backend/wiki_client.py` | MediaWiki API: raw query search + plain-text extracts (no suffix bias) |
| `backend/openfda_client.py` | OpenFDA drug/label: Rx + OTC field extraction, DailyMed links |
| `backend/config.py` | Centralised config: all endpoints, timeouts, model name, prompt limits. Loads `.env` via `load_dotenv` |
| `backend/retry.py` | Shared HTTP retry with Retry-After parsing, exponential backoff |
| `backend/session_store.py` | Supabase-backed session/message persistence (6-turn history window) |
| `backend/auth.py` | JWT verification middleware — validates Supabase tokens, exposes `get_current_user` dependency |
| `backend/routers/session_routes.py` | Session CRUD API (GET/POST/PATCH/DELETE), all auth-protected with ownership checks |
| `backend/supabase_client.py` | Supabase client singleton (uses `SUPABASE_URL` + `SUPABASE_KEY` from env) |
| `backend/logging_setup.py` | Structured logging with request-ID via context var |
| `backend/main.py` | FastAPI server, POST /api/chat SSE dispatch, session router, shutdown hooks |
| `frontend/hooks/useChatController.ts` | Single hook: reducer + stream + session store + debounced persistence |
| `frontend/hooks/useChatStream.ts` | SSE consumer (authenticatedFetch + ReadableStream + CRLF-safe parsing) |
| `frontend/hooks/useChatReducer.ts` | 13-action useReducer for chat state |
| `frontend/hooks/useSessionStore.ts` | API-backed sessions — CRUD via Supabase-authenticated fetch calls |
| `frontend/hooks/useAuth.ts` | Supabase auth hook: signIn, signUp, signOut, getToken, onAuthStateChange |
| `frontend/hooks/useScrollManager.ts` | Auto-scroll to bottom on new messages, scroll-to-latest button |
| `frontend/lib/supabase.ts` | Supabase client singleton (env-var validated) |
| `frontend/lib/api.ts` | `authenticatedFetch` — injects Supabase session JWT into requests |
| `frontend/components/AuthProvider.tsx` | React context provider for auth state, exposes `useAuthContext()` |
| `frontend/components/AuthCard.tsx` | Shared auth page layout (logo + card + footer link) |
| `frontend/components/AuthInput.tsx` | Styled input with label, error state, focus ring |
| `frontend/components/AuthButton.tsx` | Submit button with loading state |
| `frontend/app/login/page.tsx` | Login page (email + password, validation, error display) |
| `frontend/app/register/page.tsx` | Register page (email + password + display name, validation) |
| `frontend/components/MessageBubble.tsx` | Renders text with [[CITATION:N]] → inline [Wikipedia ↗] / [FDA ↗] tags |
| `frontend/components/InlineCitation.tsx` | Clickable source-labeled inline citation badges |
| `frontend/components/CitationPill.tsx` | Rich citation pills below message (title, source, external link) |
| `frontend/components/ErrorBoundary.tsx` | React error boundary — catches render crashes, shows recovery UI |
| `frontend/components/Icons.tsx` | Shared icon components (Menu, Close, Trash, ChevronDown, Send, Stop, Spinner) |
| `frontend/components/ui/liquid-glass-button.tsx` | Glassmorphism button (Radix Slot + CVA + tailwind-merge) |
| `frontend/components/ui/shader-background.tsx` | WebGL animated shader canvas (full-page background) |

## Conventions

- **Imports:** Backend uses absolute imports (`from backend.wiki_client import …`). Always run from project root with `PYTHONPATH=.`.
- **Error handling:** API clients return empty/fallback data on failure — never crash the caller. External calls always have timeouts. SSE stream always terminates with `done` or `error`.
- **Citation format:** `[[CITATION:N]]` markers. Backend normalises `[N]`, `(N)`, `[[CITATION N]]` → `[[CITATION:N]]`. Frontend renders as `[Wikipedia ↗]` (teal) / `[FDA ↗]` (amber) inline badges.
- **Concurrency:** OpenFDA drug searches run via `asyncio.gather()` in parallel. Wikipedia uses shared `AsyncClient` instance.
- **Streaming:** `_stream_ollama()` yields `(event_type, data_dict)` tuples — the caller serialises to SSE so full_text can be tracked without re-parsing.
- **Logging:** Structured with `[request_id]` column via context var. Every `logger.info/warning` call is traceable.
- **No hardcoded prompts:** `_build_prompt()` in `symptom_pipeline.py` is minimal — context sections + "answer helpfully, cite sources, include disclaimer". No system prompt, no role constraints.
- **Supabase auth:** Backend verifies JWTs locally via `python-jose` (no network call to Supabase). Frontend injects tokens via `authenticatedFetch` (`frontend/lib/api.ts`). All session routes require auth.
- **Environment variables:** Backend uses `load_dotenv()` in `config.py` to load `backend/.env`. Frontend uses `.env.local` for `NEXT_PUBLIC_SUPABASE_*` vars. Never commit `.env` files.
- **Pycache:** Always run `find backend -type d -name __pycache__ -exec rm -rf {} +` after code changes before restarting uvicorn.
- **Python deps:** Always activate the venv (`source backend/.venv/bin/activate`) before running anything.
- **Git commits:** Do NOT add `Co-Authored-By: Claude` or any AI co-author trailers to commit messages. Commit messages should reflect only the human author.
- **Deleted files:** `prompts.py`, `query_classifier.py`, `classifier_data.py`, `pubmed_client.py`, `semantic_scholar_client.py`, `rag_pipeline.py`, `rxnav_client.py`, `vision_client.py`, `storage_client.py` — do not recreate any of these.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->
