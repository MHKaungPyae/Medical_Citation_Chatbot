# Current Architecture Research

## Backend Storage
- `backend/session_store.py`: In-memory `defaultdict(list)` with `_timestamps` dict
- Interface: `get_history(session_id) -> str`, `save(session_id, role, content)`
- TTL: 30 minutes, pruned every 60 seconds
- Max turns: 6 (12 messages per session)

## Frontend Storage
- `frontend/hooks/useSessionStore.ts`: localStorage
- Keys: `medical-chatbot-sessions`, `medical-chatbot-active-session`
- Data: Session[] with messages, titles, timestamps

## Pipeline Integration
- `symptom_pipeline.py` line ~397: `session_store.get_history(session_id)`
- `symptom_pipeline.py` lines ~445-446: `session_store.save(session_id, "user", query)` and `session_store.save(session_id, "assistant", full_text)`
- These are the only 2 call sites — adding `await` is sufficient

## Auth Gap
- No auth currently — session_id is client-generated UUID
- Frontend sends session_id in POST /api/chat body
- No Authorization header anywhere

## Config
- `backend/config.py`: centralized constants
- No DATABASE_URL or JWT config exists

## Dependencies (current)
- FastAPI, httpx, uvicorn, pydantic
- No SQLAlchemy, no Alembic, no auth libraries
