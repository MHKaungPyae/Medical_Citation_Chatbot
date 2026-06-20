# Phase 5: Supabase Auth & Database

**Status:** ✅ Complete

## Goal
Add Supabase Auth (JWT) and PostgreSQL for persistent session/message storage.

## What Was Done
- Created Supabase project with 3 tables: `profiles`, `chat_sessions`, `messages`
- Backend: `supabase_client.py` singleton, `auth.py` JWT verification via `python-jose`
- Session CRUD API routes (`routers/session_routes.py`) — all auth-protected with ownership checks
- `session_store.py` rewritten from in-memory to Supabase-backed async
- `config.py` updated with `load_dotenv()` for `.env` loading
- Shutdown hooks for wiki/openfda/ollama shared clients

## Files Created
- `backend/supabase_client.py`
- `backend/auth.py`
- `backend/routers/__init__.py`
- `backend/routers/session_routes.py`
- `backend/.env` (gitignored)

## Files Modified
- `backend/session_store.py` — complete rewrite to Supabase
- `backend/config.py` — added load_dotenv
- `backend/main.py` — added session router, shutdown hooks
- `backend/symptom_pipeline.py` — added await to session_store calls
