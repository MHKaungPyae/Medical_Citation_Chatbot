# Implementation Plan: Database for Users and Chat Persistence

## Goal
Replace the in-memory session store and localStorage with a SQLite database, adding user authentication so each user has their own persistent chat history.

---

## Architecture Decisions

### Database: SQLite
- Zero configuration — single file (`backend/chatbot.db`).
- Sufficient for single-server, moderate-traffic deployment.
- WAL mode for better concurrent read performance.
- Path configured in `backend/config.py` as `DATABASE_URL`.

### ORM: SQLAlchemy 2.0 (async)
- `sqlalchemy[asyncio]` with `aiosqlite` driver.
- Async-compatible with FastAPI's async model.
- Alembic for schema migrations.
- Session dependency via FastAPI's `Depends()`.

### Auth: JWT
- `python-jose[cryptography]` for JWT encode/decode.
- `passlib[bcrypt]` for password hashing.
- Tokens passed in `Authorization: Bearer <token>` header.
- Token payload: `{"sub": user_id, "exp": expiry}`.
- Access token lifetime: 7 days (configurable in `config.py`).

### Frontend Auth
- Login/Register pages at `/login` and `/register`.
- Token stored in `localStorage` (simplest; httpOnly cookies would be more secure but add complexity).
- All API calls include `Authorization` header via a shared fetch wrapper.
- Unauthenticated users redirected to `/login`.

---

## Data Models

### User
```python
class User(Base):
    __tablename__ = "users"
    id: str          # UUID primary key
    email: str       # unique, indexed
    password_hash: str
    display_name: str | None
    created_at: datetime
    updated_at: datetime
```

### ChatSession
```python
class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id: str          # UUID primary key
    user_id: str     # FK -> users.id, indexed
    title: str
    created_at: datetime
    updated_at: datetime
```

### Message
```python
class Message(Base):
    __tablename__ = "messages"
    id: str          # UUID primary key
    session_id: str  # FK -> chat_sessions.id, indexed
    role: str        # "user" or "assistant"
    content: str
    citations_json: str | None  # JSON-serialized citation list
    created_at: datetime
```

---

## Phase Plan

### Phase 1: Database Foundation
**Goal:** Set up SQLAlchemy models, engine, and Alembic migrations.

**Files to create:**
- `backend/database.py` — engine, session factory, Base, `get_db` dependency
- `backend/models.py` — User, ChatSession, Message ORM models
- `alembic.ini` — Alembic configuration
- `alembic/env.py` — migration environment
- `alembic/versions/` — initial migration

**Files to modify:**
- `backend/config.py` — add `DATABASE_URL`, `JWT_SECRET`, `JWT_ALGORITHM`, `JWT_EXPIRY_DAYS`
- `backend/requirements.txt` — add `sqlalchemy[asyncio]`, `aiosqlite`, `alembic`, `python-jose[cryptography]`, `passlib[bcrypt]`

**Verification:**
```bash
cd /Users/panda/Desktop/Medical_Citation_Chatbot
source backend/.venv/bin/activate
alembic upgrade head
# Verify tables exist
python -c "import sqlite3; conn = sqlite3.connect('backend/chatbot.db'); print(conn.execute('SELECT name FROM sqlite_master WHERE type=\"table\"').fetchall()); conn.close()"
```

---

### Phase 2: Auth System
**Goal:** Implement user registration, login, and JWT-based authentication middleware.

**Files to create:**
- `backend/auth.py` — password hashing, JWT creation/verification, `get_current_user` dependency
- `backend/routers/auth_routes.py` — POST /api/auth/register, POST /api/auth/login

**Files to modify:**
- `backend/main.py` — include auth router, add auth dependency to chat endpoint

**API contracts:**
```
POST /api/auth/register
  Body: { "email": str, "password": str, "display_name"?: str }
  Response: { "id": str, "email": str, "token": str }

POST /api/auth/login
  Body: { "email": str, "password": str }
  Response: { "id": str, "email": str, "token": str }
```

**Verification:**
```bash
# Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

---

### Phase 3: Backend Session Store Migration
**Goal:** Replace the in-memory `SessionStore` with a database-backed implementation.

**Files to modify:**
- `backend/session_store.py` — rewrite to use SQLAlchemy async sessions instead of in-memory dict
- `backend/symptom_pipeline.py` — no changes needed if `session_store` interface stays the same

**Key constraint:** The `SessionStore` interface (`get_history(session_id) -> str`, `save(session_id, role, content)`) must be preserved so `symptom_pipeline.py` does not need changes.

**New interface additions:**
- `get_sessions(user_id) -> list[dict]` — list user's sessions
- `get_session_messages(session_id) -> list[dict]` — get messages for a session
- `create_session(user_id, title) -> str` — create a new session
- `delete_session(session_id) -> bool` — delete a session

**Verification:**
```bash
# Start server and send a chat message
# Verify message appears in SQLite
python -c "import sqlite3; conn = sqlite3.connect('backend/chatbot.db'); print(conn.execute('SELECT * FROM messages').fetchall()); conn.close()"
```

---

### Phase 4: API Endpoints for Sessions and Messages
**Goal:** Expose CRUD endpoints for chat sessions and message history.

**Files to create:**
- `backend/routers/session_routes.py` — session CRUD endpoints

**Files to modify:**
- `backend/main.py` — include session router

**API contracts:**
```
GET /api/sessions
  Headers: Authorization: Bearer <token>
  Response: [{ "id": str, "title": str, "created_at": str, "updated_at": str }]

GET /api/sessions/{session_id}/messages
  Headers: Authorization: Bearer <token>
  Response: [{ "id": str, "role": str, "content": str, "citations": [...], "created_at": str }]

POST /api/sessions
  Headers: Authorization: Bearer <token>
  Body: { "title"?: str }
  Response: { "id": str, "title": str }

DELETE /api/sessions/{session_id}
  Headers: Authorization: Bearer <token>
  Response: { "ok": true }

PATCH /api/sessions/{session_id}
  Headers: Authorization: Bearer <token>
  Body: { "title": str }
  Response: { "id": str, "title": str }
```

**Verification:**
```bash
TOKEN="<from login>"
# Create session
curl -X POST http://localhost:8000/api/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Chat"}'

# List sessions
curl http://localhost:8000/api/sessions -H "Authorization: Bearer $TOKEN"

# Get messages
curl http://localhost:8000/api/sessions/<id>/messages -H "Authorization: Bearer $TOKEN"
```

---

### Phase 5: Frontend Auth UI
**Goal:** Add login/register pages and auth token management.

**Files to create:**
- `frontend/app/login/page.tsx` — login form
- `frontend/app/register/page.tsx` — registration form
- `frontend/lib/api.ts` — fetch wrapper with auth header injection
- `frontend/hooks/useAuth.ts` — auth state management (token, user, login, logout)

**Files to modify:**
- `frontend/lib/constants.ts` — add `AUTH_TOKEN_KEY`
- `frontend/lib/types.ts` — add `User` type
- `frontend/app/layout.tsx` — add auth context provider, redirect unauthenticated

**Verification:**
- Navigate to `/login` — form renders
- Register a new user — redirects to chat
- Refresh page — stays logged in (token in localStorage)
- Logout — redirects to `/login`

---

### Phase 6: Frontend Session Migration
**Goal:** Replace localStorage session management with API calls.

**Files to modify:**
- `frontend/hooks/useSessionStore.ts` — replace localStorage with API calls via `api.ts`
- `frontend/hooks/useChatController.ts` — pass auth token to stream requests
- `frontend/hooks/useChatStream.ts` — include `Authorization` header in fetch

**Migration strategy:**
- On first login, if localStorage has existing sessions, offer to import them (POST each session's messages to the API).
- After import (or if user declines), clear localStorage session data.
- If no existing localStorage data, skip migration prompt.

**Verification:**
- Send a chat message — message persists in DB
- Refresh page — message history loads from API
- Create multiple sessions — sidebar shows API-backed sessions
- Delete a session — removed from DB

---

### Phase 7: Cleanup and End-to-End Testing
**Goal:** Remove obsolete code, verify full flow.

**Files to remove/deprecate:**
- `backend/rxnav_client.py` — already unwired, can be deleted
- Old in-memory session store logic (now replaced)

**Files to verify unchanged:**
- `backend/symptom_pipeline.py` — pipeline still works with new session store interface
- `backend/wiki_client.py` — unchanged
- `backend/openfda_client.py` — unchanged
- Frontend citation rendering — unchanged

**Full E2E verification:**
1. Start fresh: delete `backend/chatbot.db`
2. Run `alembic upgrade head`
3. Start backend and frontend
4. Register a new user
5. Ask a medical question
6. Verify citations render correctly
7. Refresh page — message history persists
8. Create a new session — verify sidebar updates
9. Switch between sessions — messages load correctly
10. Delete a session — verify removal
11. Restart server — data persists

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| SQLite write contention under concurrent users | Medium | WAL mode + single-server deployment; migrate to PostgreSQL later if needed |
| Breaking SSE streaming | High | Preserve `session_store` interface; pipeline code unchanged |
| JWT secret leakage | High | Store in env var, not in code; add to `.gitignore` |
| Frontend localStorage data loss on migration | Low | Offer import prompt; document that old sessions are browser-local only |
| Alembic migration conflicts | Low | Single-developer project; linear migration history |
| Password security | Medium | bcrypt hashing, minimum 8-char password requirement |

## Assumptions
- Single-server deployment (SQLite is sufficient).
- No need for refresh tokens initially (7-day access token is acceptable).
- No need for email verification initially (can add later).
- No need for OAuth/social login initially.
- The existing `session_store` interface in `symptom_pipeline.py` is the integration contract — it must be preserved.

## Dependencies to Add
```
sqlalchemy[asyncio]>=2.0
aiosqlite>=0.20
alembic>=1.13
python-jose[cryptography]>=3.3
passlib[bcrypt]>=1.7
```
