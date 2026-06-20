# Phase 2: Backend Integration

## Goal
Set up supabase-py client, rewrite session_store to use Supabase.

## Files to Create
- `backend/supabase_client.py` — Supabase client singleton

## Files to Modify
- `backend/config.py` — add SUPABASE_URL, SUPABASE_KEY
- `backend/requirements.txt` — add supabase
- `backend/session_store.py` — rewrite to use Supabase

## Steps
1. Add `supabase` to requirements.txt
2. Add SUPABASE_URL and SUPABASE_KEY to config.py (from env vars)
3. Create `backend/supabase_client.py`:
   - `get_supabase() -> Client` — singleton factory
4. Rewrite `backend/session_store.py`:
   - `get_history(session_id) -> str` — query messages table, format as text
   - `save(session_id, role, content)` — insert into messages table
   - `create_session(user_id, title) -> str` — insert into chat_sessions
   - `get_sessions(user_id) -> list` — query chat_sessions for user
   - `delete_session(session_id)` — delete from chat_sessions (cascade deletes messages)
5. Update `backend/symptom_pipeline.py`:
   - Add `await` at the 2 session_store call sites

## Verification
```bash
# Start server, send a chat, check Supabase dashboard for data
PYTHONPATH=. uvicorn backend.main:app --reload --port 8000
```

## Rollback
Revert session_store.py to in-memory dict.
