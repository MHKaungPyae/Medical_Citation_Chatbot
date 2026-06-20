# Medical Chatbot — Project Plan

## Goal

Build a generative medical chatbot using FastAPI, React, and local Ollama (`qwen2.5:7b`) that retrieves live data from Wikipedia and OpenFDA APIs to answer any medical question — drug explanations, symptom inquiries, side effects, interactions, and more. Supabase provides auth and persistent storage.

> **History:** Started as PubMed + OpenFDA citation chatbot → pivoted to Wikipedia + OpenFDA generative RAG. Later removed hardcoded prompts, keyword classifier, and RxNav pipeline phase. Supabase added for auth + persistence.

---

## Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS | Server components, App Router, type safety |
| Backend | FastAPI + Python 3.12 | Async, SSE support, dependency injection |
| LLM | `qwen2.5:7b` via Ollama (local) | 32K context, instruction-following, no cloud dependency |
| Streaming | Server-Sent Events (SSE) over HTTP | Simple, unidirectional, works with fetch/ReadableStream |
| HTTP Client | `httpx` (async) | Shared clients, timeout control, retry support |
| Data Sources | Wikipedia MediaWiki + OpenFDA Drug Label | Free, no keys, medical coverage |
| Auth | Supabase Auth (JWT) + `python-jose` verification | Built-in email/password, token-based |
| Database | Supabase PostgreSQL (hosted) | Persistent sessions/messages, no local setup |
| Frontend Auth | `@supabase/supabase-js` + `authenticatedFetch` | Session management, token injection |

---

## Status

### Completed

- [x] Phase 0: Environment & Agent Setup
- [x] Phase 1: Local AI Engine (FastAPI + Ollama streaming)
- [x] Phase 2: Live Medical Data Integration (Wikipedia, OpenFDA, RxNav built then unwired)
- [x] Phase 3: Web RAG Fusion (pipeline, prompt, session store, citations)
- [x] Phase 4: Web Frontend (components, state, SSE consumer, citation rendering)
- [x] Phase 5: Supabase Auth & Database (JWT middleware, session CRUD, login/register)
- [x] Phase 6: Frontend Session Migration (localStorage → Supabase API)

### Remaining

- [ ] Phase 7: Unit Tests (`pytest-httpx` for backend, `vitest` + MSW for frontend)
- [ ] Phase 8: Evaluation Baseline (15 questions + groundedness/citation accuracy scoring)

---

## Architecture

```
User → Next.js (port 3000) → FastAPI (port 8000) → Wikipedia / OpenFDA / Ollama
                ↕                       ↕
          Supabase Auth          Supabase PostgreSQL
          (JWT tokens)           (sessions + messages)
                                   ↑
                          SSE: token | citation | done | error | warning | info
```

### Pipeline (7 Phases)

```
Phase 1 — Wikipedia search (raw query → extracts, fallback: drug name search)
Phase 2 — Heuristic drug extraction (3-pass: capitalized, all-caps, lowercase)
Phase 3 — OpenFDA concurrent drug label searches
Phase 4 — Citation metadata (Wiki + FDA → indexed list)
Phase 5 — Minimal prompt (context + "answer helpfully, cite sources, include disclaimer")
Phase 6 — Stream (citations → info/warning → token stream → post-process → done)
Phase 7 — Persist conversation to Supabase
```

### Module Graph

```
main.py
  ├── symptom_pipeline.py              ← self-contained; no hardcoded prompts
  │     ├── wiki_client.py             ← MediaWiki search + extract
  │     ├── openfda_client.py          ← FDA drug labels (Rx + OTC fields)
  │     ├── session_store.py           ← Supabase-backed persistence
  │     ├── config.py                  ← constants + load_dotenv
  │     ├── retry.py                   ← HTTP retry with Retry-After
  │     └── logging_setup.py           ← request-ID context var
  ├── routers/session_routes.py        ← session CRUD API (auth-protected)
  ├── auth.py                          ← JWT verification (python-jose)
  └── supabase_client.py               ← Supabase client singleton

Unused / standby:
  rxnav_client.py   ← RxNorm drug name → RxCUI (unwired 2026-06-18)
```

---

## Key Design Decisions

### 1. Generative RAG (no classifier, no hardcoded prompt)
All queries accepted unconditionally. Pipeline builds minimal prompt with context; LLM decides how to answer. Drug names extracted heuristically (3-pass: capitalized + all-caps + lowercase 4-15 char).

### 2. OTC + Rx field extraction
OpenFDA uses different field names for OTC ("Drug Facts") vs Rx labels. Client extracts both, Rx takes priority.

### 3. Citation rendering
`[[CITATION:N]]` markers → inline `[Wikipedia ↗]` (teal) / `[FDA ↗]` (amber) tags + rich pills below message.

### 4. Supabase for auth + persistence
Replaced in-memory session store + localStorage with Supabase PostgreSQL + Supabase Auth. JWT verification in FastAPI, `authenticatedFetch` in frontend.

### 5. Shared HTTP clients
All three external services (Wiki, OpenFDA, Ollama) use shared `httpx.AsyncClient` instances with proper shutdown hooks.

---

## Phase Details

> Individual phase files: `plan/project-overview/phases/`

### Phase 7: Unit Tests
**Goal:** Add automated test coverage for backend and frontend.

**Backend (`pytest-httpx`):**
- `test_wiki_client.py` — mock MediaWiki API responses
- `test_openfda_client.py` — mock FDA API responses, OTC/Rx field extraction
- `test_session_store.py` — mock Supabase client
- `test_symptom_pipeline.py` — mock all external calls, verify prompt assembly
- `test_auth.py` — JWT verification with valid/invalid/expired tokens

**Frontend (`vitest` + MSW):**
- `useChatReducer.test.ts` — all 12 action types
- `useSessionStore.test.ts` — API call mocking
- `MessageBubble.test.tsx` — citation rendering

---

### Phase 8: Evaluation Baseline
**Goal:** Measure answer quality with a fixed question set.

- 15 medical questions covering: drug info, side effects, interactions, symptoms, conditions
- Score: groundedness (is the answer supported by sources?), citation accuracy (do citations exist and match?), medical disclaimer present
- Run against qwen2.5:7b with current pipeline

---

## APIs Evaluated (8 total)

| API | Chosen? | Reason |
|-----|---------|--------|
| **Wikipedia (MediaWiki)** | ✅ Yes | Free, no key. Medical articles + extracts. |
| **OpenFDA drug/label** | ✅ Yes | Free, no key. FDA labels with OTC + Rx fields. |
| **RxNav/RxNorm** | ⬜ Standby | Client built but removed from pipeline (unnecessary latency). |
| **DailyMed** | ❌ No | Redundant with OpenFDA. |
| **Infermedica** | ❌ No | Commercial, rate-limited (100 req/d). |
| **ClinicalTrials.gov** | ❌ No | Supplementary, not core. |
| **NLM Drug Interaction** | ❌ No | Only useful for two-drug queries. |
| **MyHealthFinder** | ❌ No | Prevention/screening only. |

---

## Deleted / Unwired Modules

| Module | When | Why |
|--------|------|-----|
| `prompts.py` | 2026-06-17 | Hardcoded prompt → minimal inline instruction |
| `classifier_data.py` | 2026-06-17 | Drug/condition keyword lists → heuristic extraction |
| `query_classifier.py` | 2026-06-17 | Keyword classifier → all queries proceed |
| `pubmed_client.py` | earlier | Poor relevance, XML overhead, API key required |
| `semantic_scholar_client.py` | earlier | Severe 429 rate limiting |
| `rag_pipeline.py` | earlier | Full redesign → `symptom_pipeline.py` |
| `rxnav_client.py` | 2026-06-18 | Unwired — heuristic extraction sufficient |

---

## Known Limitations

| Issue | Impact | Mitigation |
|-------|--------|------------|
| No unit tests | Regression risk | Planned (Phase 7) |
| No evaluation baseline | Cannot measure quality | Planned (Phase 8) |
| No frontend tests | UI regression risk | Manual browser testing |
| Single model | No fallback | Connection error surfaced to user |
| Heuristic drug extraction | May miss unusual names | 3-pass extraction catches most |
| No rate limiting | OpenFDA has limits | Retry logic handles 429 |
