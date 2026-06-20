# Add User Database & Persistent Chat Storage (Supabase)

## Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Database | Supabase PostgreSQL | Hosted, no local setup, free tier available |
| Auth | Supabase Auth | Built-in email/password, JWT tokens, user management |
| Backend Client | supabase-py | Official Python client for Supabase |
| Frontend Client | @supabase/supabase-js | Official JS client, handles auth state |

## Data Models

### profiles (extends Supabase auth.users)
- id: UUID (PK, references auth.users.id)
- display_name: String (nullable)
- created_at: DateTime

### chat_sessions
- id: UUID (PK)
- user_id: UUID (FK → auth.users.id, indexed)
- title: String
- created_at: DateTime
- updated_at: DateTime

### messages
- id: UUID (PK)
- session_id: UUID (FK → chat_sessions.id, indexed)
- role: String ("user" | "assistant")
- content: Text
- citations_json: Text (JSON string, nullable)
- created_at: DateTime

## Key Constraint

The `session_store` interface (`get_history(session_id) -> str`, `save(session_id, role, content)`) must be preserved so `symptom_pipeline.py` needs only `await` added at its 2 call sites.

## Phase Plan

1. **Supabase Setup** — Create project, run SQL schema, configure env vars
2. **Backend Integration** — supabase-py client, session_store rewrite
3. **Auth Middleware** — Verify Supabase JWT tokens in FastAPI
4. **API Endpoints** — CRUD for sessions/messages
5. **Frontend Auth** — @supabase/supabase-js, login/register, AuthProvider
6. **Frontend Session Migration** — Replace localStorage with API calls
7. **Cleanup & Testing**

## Risks

- **Supabase free tier limits**: 500MB DB, 50K monthly active users. Sufficient for dev/small production.
- **Network latency**: Supabase is hosted — adds ~50-100ms vs local SQLite. Acceptable for chat app.
- **SSE streaming breakage**: Preserving session_store interface minimizes pipeline changes.
- **localStorage data loss**: One-time import on first login.
