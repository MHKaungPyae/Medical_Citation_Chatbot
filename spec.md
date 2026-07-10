# System Specification: Medical Citation Chatbot

> **Version:** 0.1.0  
> **Last updated:** 2026-06-18  
> **Scope:** This document describes the system *as built*, not as planned. For roadmap and history see `plan/project-overview/`.

---

## 1. System Overview

A generative RAG chatbot that answers any medical question using live data from Wikipedia and OpenFDA, streamed through a local Ollama LLM to a React frontend.

**Key principle:** No hardcoded prompts, no keyword classifiers, no drug/condition lists. The pipeline always fetches context, then the LLM decides how to answer.

```
User → Next.js (:3000) → FastAPI (:8000) → Wikipedia / OpenFDA / Ollama
                               ↑
                      SSE: token | citation | done | error | warning | info
```

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS |
| Backend | FastAPI + Python 3.12 |
| Streaming | Server-Sent Events (SSE) over HTTP |
| LLM | `medgemma1.5:4b-it-q8_0` via Ollama (local) |
| APIs | Wikipedia MediaWiki, OpenFDA Drug Label |
| HTTP | `httpx` (async) |
| Auth | Supabase Auth (JWT) + `python-jose` verification |
| Database | Supabase PostgreSQL (sessions, messages, profiles) |

---

## 2. Backend

### 2.1 Module Graph

```
main.py
  ├── symptom_pipeline.py              ← self-contained; no hardcoded prompts
  │     ├── wiki_client.py             ← MediaWiki search + extract
  │     ├── openfda_client.py          ← FDA drug labels (Rx + OTC fields)
  │     ├── session_store.py           ← Supabase-backed session/message persistence
  │     ├── config.py                  ← all constants + load_dotenv
  │     ├── retry.py                   ← shared HTTP retry with Retry-After
  │     └── logging_setup.py           ← request-ID context var
  ├── routers/session_routes.py        ← session CRUD API (auth-protected)
  ├── auth.py                          ← JWT verification (python-jose)
  └── supabase_client.py               ← Supabase client singleton
```

`rxnav_client.py` was deleted — heuristic drug extraction proved sufficient.

### 2.2 Endpoints

#### `GET /api/health`
Returns `{"status": "ok"}`. No auth. Used for readiness check.

#### `POST /api/chat`
Streaming SSE endpoint. Accepts JSON:
```json
{
  "query": "explain about paracetamol...",
  "session_id": "<uuid>"
}
```

**Auth:** Requires `Authorization: Bearer <supabase_jwt>` header.

**Validation:** If `query` is empty/missing → yield single `error` event with code `EMPTY_QUERY`.

**Error guard:** All pipeline exceptions are caught and surfaced as `event: error` with code `INTERNAL_ERROR`. The SSE stream never hangs.

#### Session Routes (all auth-protected)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET /api/sessions` | List user's sessions (most recent first) |
| `POST /api/sessions` | Create new session |
| `GET /api/sessions/{id}/messages` | Get messages for a session (ownership check) |
| `PATCH /api/sessions/{id}` | Update session title (ownership check) |
| `DELETE /api/sessions/{id}` | Delete session + messages (ownership check) |

### 2.3 SSE Wire Format

Events arrive in this order:

```
event: citation              ← one per source (before tokens)
data: {"index":1, "url":"...", "title":"Paracetamol", "source":"wikipedia"}

event: citation
data: {"index":2, "url":"...", "title":"FDA Label: acetaminophen", "source":"fda"}

event: info                  ← optional, lists drugs looked up
data: {"message":"Looked up information on: paracetamol, glucosamine"}

event: warning               ← optional, when no data found
data: {"message":"Limited medical information found..."}

event: token                 ← streaming, `n` events
data: {"text":"Para"}

event: token
data: {"text":"cetamol"}

event: done                  ← terminal (error also terminates)
data: {"full_text":"...", "citations":[{...}]}

event: error                 ← terminal, on failure
data: {"message":"...", "code":"TIMEOUT"|"CONNECTION_REFUSED"|"INTERNAL_ERROR"|"EMPTY_QUERY"}
```

### 2.4 Pipeline (7 Phases)

```
Phase 1 — Wikipedia search
  search_wikipedia(raw query, max_results=3) → [{pageid, title, snippet, url}]
  get_wiki_extracts([pageids]) → {pageid: plain_text}
  ↓ (fallback: if 0 results, search "{drug_name} medication" for each extracted drug)

Phase 2 — Heuristic drug name extraction
  Input: user query text + Wiki article titles + Wiki extracts
  _extract_drug_names_from_text():
    1. Extra names first (article titles)
    2. Pass 1: [A-Z][a-z]{2,} optionally followed by hyphen/space + [a-z]{3,}
    3. Pass 2: all-caps abbreviations [A-Z]{3,6}
    4. Pass 3: [a-z]{4,15}
    4. Filter against 140-word STOP_WORDS frozenset
    5. Deduplicate, return top 4
  ↓
Phase 3 — OpenFDA
  For each drug name (concurrent via asyncio.gather):
    search_openfda(name)
      Query: brand_name + generic_name + substance_name
      Extract Rx fields: warnings_and_cautions, adverse_reactions, contraindications,
                         drug_interactions, boxed_warning, indications_and_usage,
                         dosage_and_administration
      Extract OTC fields: warnings, do_not_use, stop_use, ask_doctor,
                          ask_doctor_or_pharmacist, pregnancy_or_breast_feeding
      Merge: Rx takes priority, OTC as fallback
      URL: DailyMed if set_id available, otherwise OpenFDA search URL
  ↓
Phase 4 — Citation metadata
  Build citation list: Wiki articles first (index 1..N), then FDA results (N+1..M)
  Each: {index, url, title, source: "wikipedia"|"fda"}
  ↓
Phase 5 — Build prompt
  _build_prompt(query, wiki_context, fda_context, conversation_history):
    1. ## PREVIOUS CONVERSATION (if any)
    2. ## WIKIPEDIA MEDICAL INFORMATION
    3. ## FDA DRUG LABEL INFORMATION
    4. ## USER'S QUESTION
    5. Minimal guidance: "Answer helpfully...cite sources...include disclaimer"
  No hardcoded behavior rules, no system prompt, no role constraints.
  ↓
Phase 6 — Stream
  6a: Yield citation events (all metadata upfront)
  6b: Yield info event (drugs looked up)
  6c: Yield warning event (if nothing found)
  6d: _stream_ollama(prompt) → token-by-token via Ollama /api/generate
  6e: Citation post-processing:
      - _normalize_citation_markers(): [N], (N), [[CITATION N]] → [[CITATION:N]]
      - _extract_citations(): find all used indices
      - Yield done event with filtered citations
  ↓
Phase 7 — Persist conversation
  session_store.save(session_id, "user", query)
  session_store.save(session_id, "assistant", full_text)
```

### 2.5 Session Store

- **Storage:** Supabase PostgreSQL (persistent across restarts)
- **Tables:** `chat_sessions` (id, user_id, title, created_at, updated_at), `messages` (id, session_id, role, content, citations_json, created_at)
- **Window:** Last 6 turns (12 messages) fetched for prompt context
- **Auth:** All operations require valid Supabase JWT; ownership enforced per user
- **Format returned to prompt:**
  ```
  User: <query>
  Assistant: <response>
  User: <query>
  Assistant: <response>
  ...
  ```

### 2.6 Ollama Integration

```
POST http://localhost:11434/api/generate
Body: {"model": "medgemma1.5:4b-it-q8_0", "prompt": "<assembled prompt>", "stream": true}
Timeout: 120s total, 10s connect
```

Error handling:
| Exception | SSE Event |
|-----------|-----------|
| `httpx.TimeoutException` | `error` (TIMEOUT) |
| `httpx.ConnectError` | `error` (CONNECTION_REFUSED) |

### 2.7 Citation Normalization

The LLM may use several citation formats. The post-processor normalizes them all:

| Input | Output |
|-------|--------|
| `[1]` | `[[CITATION:1]]` |
| `(1)` | `[[CITATION:1]]` |
| `[[CITATION 1]]` | `[[CITATION:1]]` |

Only indices actually present in the final normalized text are included in the `done` event.

---

## 3. Frontend

### 3.1 Component Tree

```
layout.tsx
  └── AuthProvider.tsx               ← Supabase auth context (wraps all pages)
        ├── page.tsx                 ← auth guard (redirects to /login if unauthenticated)
        │     ├── Sidebar.tsx        ← session list + user profile at bottom
        │     ├── ChatContainer.tsx  ← main chat area
        │     │     ├── EmptyState.tsx
        │     │     ├── MessageList.tsx
        │     │     │     └── MessageBubble.tsx
        │     │     │           ├── InlineCitation.tsx
        │     │     │           └── CitationPill.tsx
        │     │     ├── StatusBubble.tsx
        │     │     └── StreamingDots.tsx
        │     ├── AutoExpandTextarea.tsx
        │     └── SendButton.tsx
        ├── /login/page.tsx          ← login form (AuthCard + AuthInput + AuthButton)
        └── /register/page.tsx       ← register form (AuthCard + AuthInput + AuthButton)
```

### 3.2 State Management

Single `useReducer` with **12 action types**:

| Action | Purpose |
|--------|---------|
| `ADD_USER_MESSAGE` | Append user message to `messages[]` |
| `CREATE_ASSISTANT_MESSAGE` | Append empty assistant bubble, set `isStreaming: true` |
| `APPEND_TOKEN` | Append text to last assistant message content |
| `ADD_CITATION` | Append citation to last assistant message citations |
| `SET_STREAMING_DONE` | Mark last message `status: "done"`, preserve accumulated citations if backend sends empty array |
| `SET_ERROR` | Mark last message `status: "error"` with errorMessage |
| `SET_WARNING` | Set warningMessage on last message |
| `SET_STATUS` | Set global statusMessage |
| `HIDE_STATUS` | Clear global statusMessage |
| `CLEAR_CHAT` | Reset to initial state, optionally with new sessionId |
| `LOAD_SESSION` | Replace messages from saved session |
| `SET_SESSION_ID` | Update sessionId only |

**Citation persistence bug (fixed):** When backend sends `citations: []` in the `done` event (model used non-standard markers), the reducer preserves accumulated citations from `ADD_CITATION` events rather than overwriting them.

### 3.3 SSE Consumer (`useChatStream`)

```
sendMessage(query):
  1. Abort previous stream if active
  2. Dispatch ADD_USER_MESSAGE (optimistic)
  3. Dispatch CREATE_ASSISTANT_MESSAGE
  4. Dispatch SET_STATUS("Searching medical information...")
  5. fetch(POST /api/chat) with AbortController
  6. Read ReadableStream:
     - Buffer lines, split on \n, strip \r (CRLF-safe)
     - Parse "event: <type>" / "data: <json>" pairs
     - Dispatch appropriate actions per event type
  7. On AbortError: call setStreamingDone() (keep partial text)
  8. On fetch error: dispatch SET_ERROR
```

**Source coercion (fixed):** Citation `source` field is validated against `"wikipedia" | "fda"` union type. Unknown source strings are coerced to `"wikipedia"` rather than crashing.

### 3.4 Session Persistence (`useChatController` + `useSessionStore`)

```
Startup:
  1. useChatController loads sessions from API (GET /api/sessions)
  2. If sessions exist → loads most recent session's messages
  3. If no sessions → creates a new one via API (POST /api/sessions)

During streaming:
  - Messages persisted via API (debounced)

Session operations:
  - newSession() → POST /api/sessions
  - switchSession(id) → GET /api/sessions/{id}/messages
  - deleteSession(id) → DELETE /api/sessions/{id}
  - updateSessionTitle(id, title) → PATCH /api/sessions/{id}

Auth:
  - All API calls use authenticatedFetch (Supabase JWT injected)
  - Unauthenticated users redirected to /login
```

### 3.5 Citation Rendering

Inline markers `[[CITATION:N]]` in the response text are parsed by `MessageBubble`:
- **Inline:** Source-tagged badges — `[Wikipedia ↗]` (teal) / `[FDA ↗]` (amber)
- **Below message:** `CitationPill` showing full title, source label, external link
- Hover shows article title tooltip

### 3.6 UI States

| State | Visual |
|-------|--------|
| **Idle** | EmptyState ("Medical Research Assistant" + example question chips) |
| **Searching** | StatusBubble: "Searching medical sources..." |
| **Streaming** | StreamingDots animation + token-by-token text appearing |
| **Complete** | Full text + inline citations + citation pills |
| **Error** | Error message in bubble ("streaming cancelled" on abort, or server error) |
| **No data** | Warning pill: "Limited medical information found. Please see a doctor..." |

---

## 4. Data Sources

### 4.1 Wikipedia (MediaWiki API)

```
GET https://en.wikipedia.org/w/api.php
  ?action=query
  &list=search
  &srsearch={query}
  &srlimit=3
  &srprop=snippet
  &format=json

→ [{pageid, title, snippet}]
→ GET extracts for each pageid (exintro, explaintext, exchars=800)
→ {pageid: plain_text_intro}
```

- No API key needed
- Requires `User-Agent` header
- Searches raw query directly (no medical suffix bias)
- Fallback: if no results, search `"{drug_name} medication"`
- Shared `httpx.AsyncClient` instance with User-Agent header
- Max 2 retries, 1.0s delay (via `retry_get`)

### 4.2 OpenFDA Drug Label

```
GET https://api.fda.gov/drug/label.json
  ?search=openfda.brand_name:"{drug}"
          +openfda.generic_name:"{drug}"
          +openfda.substance_name:"{drug}"
  &limit=1

→ Extract Rx + OTC fields (see Pipeline Phase 3)
→ DailyMed URL if set_id present: https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid={set_id}
```

- No API key needed
- Timeout: 10s total, 5s connect
- Max 3 retries, 1.0s initial delay (via `retry_get`)
- Transient errors (429, 502, 503, 504) retried; others fail immediately

### 4.3 Ollama (Local LLM)

```
POST http://localhost:11434/api/generate
Body: {"model": "medgemma1.5:4b-it-q8_0", "prompt": "...", "stream": true}
→ NDJSON stream: {"response": "token", "done": false} per line
→ Final: {"done": true}
```

- Local, no network dependency (besides localhost)
- 32K context window

---

## 5. Configuration

All settings in `backend/config.py`:

| Constant | Value | Notes |
|----------|-------|-------|
| `OLLAMA_URL` | `http://localhost:11434/api/generate` | |
| `OLLAMA_MODEL` | `medgemma1.5:4b-it-q8_0` | |
| `OLLAMA_TIMEOUT` | 120s total, 10s connect | |
| `OPENFDA_ENDPOINT` | `https://api.fda.gov/drug/label.json` | |
| `OPENFDA_TIMEOUT` | 10s total, 5s connect | |
| `OPENFDA_MAX_RETRIES` | 3 | |
| `OPENFDA_RETRY_DELAY` | 1.0s | Doubles each retry |
| `WIKI_ENDPOINT` | `https://en.wikipedia.org/w/api.php` | |
| `WIKI_TIMEOUT` | 10s total, 5s connect | |
| `WIKI_SEARCH_LIMIT` | 3 | Per query |
| `WIKI_EXTRACT_CHARS` | 800 | Per article extract |
| `MAX_HISTORY_TURNS` | 6 | Conversation window |
| `SESSION_TTL_SECONDS` | 1800 | 30 minutes |
| `MAX_PROMPT_WORDS` | 4500 | ~6000 tokens; warn if exceeded |
| `MAX_OUTPUT_TOKENS` | 4000 | Max output tokens from Ollama (~3000 words) |

---

## 6. HTTP Retry Strategy

`retry.py` — shared across all API clients:

- **Retryable statuses:** 429, 502, 503, 504
- **Non-retryable:** All other 4xx/5xx (fail immediately)
- **Retry-After parsing:** Supports seconds-integer and HTTP-date formats (RFC 7231)
- **429 without Retry-After:** Defaults to 10s floor
- **Backoff:** Exponential doubling, capped by Retry-After when available
- **Timeouts + connection errors:** Also retried

---

## 7. Error Handling

### Backend

| Layer | Strategy |
|-------|----------|
| **Ollama timeout** | Catch `httpx.TimeoutException` → yield SSE `error` (TIMEOUT) |
| **Ollama unreachable** | Catch `httpx.ConnectError` → yield SSE `error` (CONNECTION_REFUSED) |
| **Empty query** | Validate before pipeline → yield SSE `error` (EMPTY_QUERY) |
| **Wiki search failure** | Log warning, return `[]` (never raises) |
| **Wiki extract failure** | Log warning, return `{}` (never raises) |
| **OpenFDA failure** | Log warning, return `{"not_found": true}` (never raises) |
| **OpenFDA transient** | Retry 3× with exponential backoff + Retry-After |
| **Pipeline exception** | `try/except` in main.py → yield SSE `error` (INTERNAL_ERROR) |
| **SSE never hangs** | `finally` ensures stream is always terminated |

### Frontend

| Scenario | Handling |
|----------|----------|
| **Fetch throws** | `SET_ERROR` with connection message |
| **Non-OK response** | Parse error body, `SET_ERROR` |
| **No response.body** | `SET_ERROR` |
| **AbortError** | `SET_STREAMING_DONE` (preserve partial text) |
| **Malformed SSE** | Skip unparseable JSON lines silently |
| **Empty citations in done** | Preserve accumulated citations |

---

## 8. Known Limitations

| Issue | Impact | Mitigation |
|-------|--------|------------|
| **No unit tests** | Regression risk on edits | Manual curl testing |
| **No evaluation baseline** | Cannot measure answer quality | Planned, not yet done |
| **No frontend tests** | UI regression risk | Manual browser testing |
| **Single model (medgemma1.5:4b-it-q8_0)** | No fallback if model unavailable | Connection error surfaced to user |
| **Heuristic drug extraction** | May miss unusual drug names | 3-pass extraction (capitalized + all-caps + lowercase) catches most |
| **No rate limiting** | OpenFDA has rate limits | Retry logic handles 429; no explicit client-side throttling |
