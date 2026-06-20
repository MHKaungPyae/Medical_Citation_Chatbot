# Plan: Add User Database & Persistent Chat Storage (Supabase)

## Goal
Replace in-memory session store and localStorage with Supabase PostgreSQL + Supabase Auth, so each user has persistent chat history.

## Stack
- **Database**: Supabase PostgreSQL (hosted)
- **Auth**: Supabase Auth (built-in email/password)
- **Backend**: supabase-py client
- **Frontend**: @supabase/supabase-js

## Status
- [ ] Phase 1: Supabase Setup (project, SQL schema, env vars)
- [ ] Phase 2: Backend Integration (supabase-py, session_store rewrite)
- [ ] Phase 3: Auth Middleware (verify Supabase JWT in FastAPI)
- [ ] Phase 4: API Endpoints (CRUD for sessions/messages)
- [ ] Phase 5: Frontend Auth (login/register, AuthProvider)
- [ ] Phase 6: Frontend Session Migration (localStorage → API)
- [ ] Phase 7: Cleanup and Testing
