# Development Plan: Medical Chatbot (Generative RAG)

## Objective
Build a generative medical chatbot using FastAPI, React, and local Ollama (`qwen2.5:7b`) that retrieves live data from Wikipedia and OpenFDA APIs to answer any medical question — drug explanations, symptom inquiries, side effects, interactions, and more. No hardcoded prompts or keyword lists. The LLM handles everything generatively.

> **History:** The project started as a PubMed + OpenFDA citation chatbot and pivoted to a Wikipedia + OpenFDA generative RAG system. PubMed and Semantic Scholar were removed due to poor relevance and rate limiting. Later (2026-06-17), the hardcoded system prompt, keyword classifier, drug lists, and RxNav pipeline phase were also removed — the model itself decides how to answer based on retrieved context.

---

## Current Architecture (What Was Built)

```
User → Next.js (port 3000) → FastAPI (port 8000) → Wikipedia / OpenFDA / Ollama
                ↕                       ↕
          Supabase Auth          Supabase PostgreSQL
          (JWT tokens)           (sessions + messages)
                                   ↑
                          SSE: token, citation, done, error, warning, info
```

### APIs Used by Pipeline

| API | Endpoint | Purpose | Auth |
|-----|----------|---------|------|
| **Wikipedia MediaWiki** | `en.wikipedia.org/w/api.php` | Search + plain-text extracts for medical articles | `User-Agent` header required |
| **OpenFDA Drug Label** | `api.fda.gov/drug/label.json` | FDA drug labels (warnings, side effects, indications) + DailyMed URLs | None |
| **Ollama (local)** | `localhost:11434/api/generate` | Local LLM (`qwen2.5:7b`) for generative streaming responses | None |

### APIs Available but Not Wired
| API | Endpoint | Purpose | Status |
|-----|----------|---------|--------|
| **RxNav/RxNorm** | `rxnav.nlm.nih.gov/REST` | Drug name → RxCUI normalisation, brand name lookup | Client exists (`rxnav_client.py`) but removed from pipeline 2026-06-18 — drug names from heuristic extraction were sufficient |

### Pipeline (No Classifier, No Hardcoded Prompt)
```
User query (any medical question)
  ↓
Phase 1: Wikipedia — search full query, get extracts
  ↓ (if no results: search extracted drug names)
Phase 2: Heuristic drug name extraction (capitalized words + 5-15 char lowercase, minus stop words)
  ↓
Phase 3: OpenFDA — concurrent drug label searches
  ↓
Phase 4: Citation metadata — build citation list from Wiki articles + FDA results
  ↓
Phase 5: Build minimal prompt (context + "answer the question, cite sources, include disclaimer")
  ↓
Phase 6: Stream — send citation metadata, info/warning events, then qwen2.5:7b token stream via SSE
  ↓
Phase 7: Persist conversation — save user/assistant turns to session store
  ↓
Citation post-processing: normalise markers → filter used → done event
```

### Module Graph (14 backend files)
```
main.py → symptom_pipeline.py            (self-contained — no hardcoded prompts, no keywords)
              ├── wiki_client.py          (MediaWiki API — raw query search, no suffix bias)
              ├── openfda_client.py       (FDA drug/label — OTC + Rx field extraction)
              ├── session_store.py        (Supabase-backed session/message persistence)
              ├── config.py               (centralised endpoints, timeouts, model + load_dotenv)
              ├── retry.py                (shared HTTP retry + Retry-After parsing)
              └── logging_setup.py        (request-ID via context var)
          → routers/session_routes.py     (session CRUD API — auth-protected)
          → auth.py                       (JWT verification via python-jose)
          → supabase_client.py            (Supabase client singleton)

Unused / standby:
  rxnav_client.py   — RxNorm drug name → RxCUI (removed from pipeline 2026-06-18, kept for reference)
```

### APIs Chosen (from 8 evaluated)

| API | Chosen? | Reason |
|-----|---------|--------|
| **Wikipedia (MediaWiki)** | ✅ Yes | Free, no key. Medical article search + extracts for condition/treatment info. |
| **RxNav/RxNorm** | ⬜ Standby | Free, no key. Client built but removed from pipeline (2026-06-18). Heuristic drug extraction sufficient for current use. |
| **OpenFDA drug/label** | ✅ Yes | Free, no key. FDA labels with OTC + prescription field extraction, DailyMed links. |
| **DailyMed** | ❌ No | Redundant with OpenFDA. |
| **Infermedica** | ❌ No | Best symptom→condition API but commercial and rate-limited (100 req/d). |
| **ClinicalTrials.gov** | ❌ No | Trial data — supplementary, not core. |
| **NLM Drug Interaction** | ❌ No | Only useful after identifying TWO specific drugs. Wrong use case. |
| **MyHealthFinder** | ❌ No | Prevention/screening guidelines only. |
| **NIH Clinical Table Search** | ❌ No | Evidence tables — nice-to-have but not core. |

### Deleted / Unwired Modules
- `pubmed_client.py` — deleted. Poor relevance for drug queries, XML parsing overhead, API key required. Replaced by wiki_client.py.
- `semantic_scholar_client.py` — deleted. Severe 429 rate limiting, returned irrelevant papers. Replaced by wiki_client.py.
- `rag_pipeline.py` — deleted. Full pipeline redesign → `symptom_pipeline.py`.
- `prompts.py` — deleted 2026-06-17. Hardcoded system prompt replaced by minimal generative instruction inline.
- `classifier_data.py` — deleted 2026-06-17. 589 drug + 440 condition keyword lists replaced by heuristic text extraction.
- `query_classifier.py` — deleted 2026-06-17. Keyword-based classifier removed; all queries proceed regardless of content.
- `rxnav_client.py` — unwired 2026-06-18. Still exists on disk but no longer called by pipeline. The RxCUI normalisation added latency without improving citations. Heuristic drug name extraction proved sufficient for Wikipedia + OpenFDA lookups.

---

## Key Design Decisions

### 1. OTC drug support in OpenFDA
OTC drugs (aspirin, ibuprofen) use "Drug Facts" labels with different field names than prescription drugs. The client extracts both:
- **Rx fields:** `adverse_reactions`, `warnings_and_cautions`, `contraindications`, `drug_interactions`
- **OTC fields:** `warnings`, `do_not_use`, `stop_use`, `ask_doctor`, `ask_doctor_or_pharmacist`, `pregnancy_or_breast_feeding`

### 2. Citation rendering evolution
- **v1:** Citation pills below message (`[1] PubMed ↗` — no source detail, no inline links)
- **v2:** Inline superscript (`¹` — too subtle, no source label)
- **v3 (current):** Source-labeled inline tags (`[Wikipedia ↗]` / `[FDA ↗]`) — colored, clickable, hover shows title. Accompanied by rich pills below message showing full title + metadata.

### 3. Citation persistence bug (fixed)
The backend `done` event sends `citations: []` when the model uses non-standard markers. The reducer was overwriting all accumulated `citation` SSE events with the empty array. Fixed by preserving accumulated citations when backend returns none.

### 4. Model: medgemma:4b → qwen2.5:7b
MedGemma 4B couldn't reliably follow `[[CITATION:N]]` format. qwen2.5:7b handles instruction following better and has 32K context (vs 8K).

### 5. Removal of hardcoded prompt + classifier (2026-06-17)
The original approach had a fixed system prompt ("suggest the closest OTC medication") and a keyword classifier that rejected any query not matching drug/condition lists. This broke on queries like "explain about paracetamol and I took glucosamine and have a rash". Fix:
- Deleted `prompts.py`, `classifier_data.py`, `query_classifier.py`
- Pipeline now builds a minimal, non-prescriptive prompt ("answer the question helpfully, cite sources, include disclaimer")
- Drug names extracted heuristically from user query text (capitalized words + lowercase words 5+ chars) plus Wiki extracts
- All queries proceed — the LLM itself decides how to answer
- Wikipedia client searches with raw query directly (removed medical-topic suffixes that broke conversational queries)

---

## Original Roadmap (Historical)

Below is the original 4-phase plan written before development began. Checkboxes marked `[x]` were completed; `[ ]` remain unimplemented.

### Phase 0: Environment & Agent Setup

- [x] **Install Core Dependencies:** Python 3.12+, Node.js, Ollama.
- [x] **Pull the Local Model:** `ollama pull qwen2.5:7b` (originally medgemma:4b-it, later replaced).
- [x] **Register NCBI API Key:** Was registered at account.ncbi.nlm.nih.gov for PubMed. No longer needed — all current APIs (Wikipedia, OpenFDA, Ollama) require no keys.
- [x] **Create the Claude Code Skill:** `.claude/skills/medical-rag/SKILL.md` enforces FastAPI + Next.js + Ollama + live APIs only. Updated to reflect current stack.

### Phase 1: Local AI Engine (Backend Foundation)

- [x] **Initialize FastAPI:** `backend/main.py` with CORS for frontend.
- [x] **Connect to Ollama:** Async function using `httpx` to `http://localhost:11434/api/generate`. Timeout: 120s connect, 10s connect.
- [x] **Enable Streaming:** SSE streaming with `event: token` / `event: citation` / `event: done` / `event: error` / `event: warning` / `event: info`.
- [x] **Error Handling:** Catch `httpx.TimeoutException` and `httpx.ConnectError`. Never leave SSE hanging.
- [x] **Test:** curl verified streaming end-to-end.

### Phase 2: Live Medical Data Integration

- [x] **Build the PubMed Client** — Built, then **deleted**. Poor relevance, XML overhead, API key required. Replaced by wiki_client.py.
- [x] **Build the OpenFDA Client** — Built, extended with OTC field support, DailyMed URL generation.
- [x] **Build Wikipedia Medical Client** — Added during pivot. MediaWiki API: search + extracts.
- [x] **Build RxNav Client** — Built, then **unwired** 2026-06-18. Drug name normalisation removed from pipeline (unnecessary latency).
- [x] **Build Query Classifier** — Built, then **deleted** 2026-06-17. Replaced by heuristic drug name extraction in pipeline.
- [ ] **Unit Tests:** Not yet written (requires `pytest-httpx`).

### Phase 3: Web RAG Fusion

- [x] **Prompt Engineering:** Removed hardcoded system prompt 2026-06-17. Now uses minimal generative instruction — model decides how to answer.
- [x] **Conversation History:** Supabase-backed session store (6-turn history window, persistent).
- [x] **Assemble the Route:** POST /api/chat runs wiki → drug extraction → openfda → prompt → stream → persist.
- [x] **Citation Post-Processing:** Normalises `[1]`, `(1)`, `[[CITATION N]]` → `[[CITATION:N]]`. Filters unused citations.
- [x] **Error Handling:** Warning event on empty results. Error event on timeout. All queries accepted — no non-medical rejection.
- [x] **Test:** curl verified with "I have a bad headache and fever, what can I take?" — suggested paracetamol with disclaimer.
- [ ] **Evaluation Baseline:** Not yet done (15 questions + groundedness/citation accuracy scoring).

### Phase 4: Web Frontend

- [x] **Initialize Next.js:** Next.js 16 App Router + TypeScript + Tailwind CSS.
- [x] **Component Tree:** ChatContainer, MessageList, MessageBubble, CitationPill, InlineCitation, Sidebar, SendButton, AutoExpandTextarea, EmptyState, StatusBubble, StreamingDots.
- [x] **State Management:** `useReducer` with 12 actions. Wrapped in `useChatController` hook.
- [x] **SSE Consumer:** `fetch()` with `ReadableStream` + `AbortController`. Accumulates tokens and citations.
- [x] **Citation Rendering:** Source-labeled inline tags + rich citation pills with title/metadata.
- [x] **UI States:** Idle, loading, streaming, complete, error, empty results — all handled.
- [x] **Session Persistence:** Supabase-backed via API calls (authenticated with JWT). Frontend uses `authenticatedFetch` wrapper.
- [x] **Accessibility & State Review (2026-06-18):** Second full audit via subagents. Backend: removed dead rxnav_data computation, fixed double retry nesting in OpenFDA client, eliminated duplicate find_rxcui call, removed load_dotenv, removed duplicate stop word. Frontend: fixed session bootstrap race condition, debounced localStorage writes during streaming, made sidebar session items keyboard-accessible via `<button>` elements, cleaned up 6 unused constants, removed dead useEffect import.
- [ ] **Frontend Tests:** Not yet written (vitest + MSW).
