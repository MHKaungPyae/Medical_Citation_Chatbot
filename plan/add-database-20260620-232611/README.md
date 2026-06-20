# Plan: Add Database for Users and Chat Persistence

## Goal
Add persistent storage for users, chat sessions, and messages so that conversation history survives server restarts and is tied to authenticated user accounts.

## Current State
- **Backend session storage:** In-memory Python dict (`backend/session_store.py`) — lost on restart.
- **Frontend session storage:** `localStorage` (`frontend/hooks/useSessionStore.ts`) — per-browser, not synced across devices.
- **No auth system** — all sessions are anonymous UUIDs.

## Target State
- SQLite database with SQLAlchemy ORM (simplest path, no external DB server needed).
- JWT-based authentication (register/login endpoints).
- Three models: `User`, `ChatSession`, `Message`.
- Backend persists all messages to DB; frontend fetches session list and messages from API.
- Existing SSE streaming pipeline unchanged — only the storage layer is swapped.

## Recommended Stack
| Layer | Choice | Rationale |
|-------|--------|-----------|
| Database | SQLite | Zero config, file-based, sufficient for single-server deployment |
| ORM | SQLAlchemy 2.0 (async) | Mature, FastAPI-native integration via `databases` or async session |
| Auth | JWT (python-jose + passlib[bcrypt]) | Stateless, works with SSE, no server-side session store needed |
| Migrations | Alembic | Standard SQLAlchemy migration tool |

## Phase Overview
1. **Database foundation** — models, engine, Alembic setup
2. **Auth system** — register/login endpoints, JWT middleware, password hashing
3. **Backend session store migration** — swap in-memory store for DB-backed store
4. **API endpoints** — CRUD for sessions and messages
5. **Frontend auth UI** — login/register pages, token storage, auth headers
6. **Frontend session migration** — replace localStorage with API calls
7. **Cleanup and testing** — remove old in-memory store, end-to-end verification

## Key Files
- `backend/session_store.py` — current in-memory store (to be replaced)
- `backend/symptom_pipeline.py` — calls `session_store.get_history()` and `.save()`
- `backend/main.py` — FastAPI routes
- `backend/config.py` — configuration constants
- `frontend/hooks/useSessionStore.ts` — localStorage-backed session management
- `frontend/hooks/useChatController.ts` — orchestrates sessions and chat
- `frontend/lib/types.ts` — TypeScript interfaces

## Risks
- SQLite concurrency limits (mitigated: single-server, WAL mode)
- Breaking existing SSE streaming (mitigated: pipeline calls `session_store` interface, not storage directly)
- Frontend localStorage migration (mitigated: offer one-time import, or discard old data)

## Verification
- `alembic upgrade head` creates all tables
- Register + login returns valid JWT
- POST /api/chat with auth header persists messages to DB
- GET /api/sessions returns user's sessions
- SSE streaming still works end-to-end
- Frontend login flow works, sessions load from API
