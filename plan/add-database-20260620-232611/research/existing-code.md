# Existing Code Analysis

## Current Session Storage: Backend

**File:** `backend/session_store.py`

- `SessionStore` class with in-memory `defaultdict(list)` for conversations.
- Interface: `get_history(session_id) -> str`, `save(session_id, role, content)`, `reset()`.
- Auto-prunes sessions after 30 minutes of inactivity.
- Singleton instance: `session_store = SessionStore()`.
- Used by `symptom_pipeline.py` at lines 397 and 445-446.

**Key integration point:** `symptom_pipeline.py` calls:
```python
history = session_store.get_history(session_id)  # line 397
session_store.save(session_id, "user", query)     # line 445
session_store.save(session_id, "assistant", full_text)  # line 446
```

The `session_id` is passed from `main.py` -> `run_symptom_pipeline(query, session_id)` -> `run(query, session_id)`.

## Current Session Storage: Frontend

**File:** `frontend/hooks/useSessionStore.ts`

- `useSessionStore()` hook manages sessions in React state + localStorage.
- Storage keys: `medical-chatbot-sessions`, `medical-chatbot-active-session`.
- Session type: `{ id, title, createdAt, updatedAt, messages[] }`.
- Operations: `updateSessionInStore`, `newSession`, `switchSession`, `deleteSession`.

**File:** `frontend/hooks/useChatController.ts`

- Orchestrates `useSessionStore`, `useChatReducer`, `useChatStream`.
- Debounced persistence to localStorage during streaming (500ms).
- Immediate flush on stream end.

## Current API Contract

**File:** `backend/main.py`

```
POST /api/chat
  Body: { "query": str, "session_id": str }
  Response: SSE stream (text/event-stream)
    Events: token, citation, done, error, warning, info
```

No auth headers. `session_id` is a client-generated UUID string.

## Frontend Types

**File:** `frontend/lib/types.ts`

```typescript
interface Citation { index, url, title, source, authors?, year?, journal? }
interface Message { id, role, content, citations, status, errorMessage?, warningMessage? }
interface Session { id, title, createdAt, updatedAt, messages }
type MessageStatus = 'streaming' | 'done' | 'error'
```

## Config Constants

**File:** `backend/config.py`

- `MAX_HISTORY_TURNS = 6` — conversation window for LLM context
- `SESSION_TTL_SECONDS = 1800` — 30-minute TTL (will be irrelevant with DB)
- No database-related config exists yet.

## Frontend Constants

**File:** `frontend/lib/constants.ts`

- `STORAGE_KEYS.SESSIONS = 'medical-chatbot-sessions'`
- `STORAGE_KEYS.ACTIVE_SESSION = 'medical-chatbot-active-session'`
- `API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'`
