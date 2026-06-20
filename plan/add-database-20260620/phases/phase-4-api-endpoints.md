# Phase 4: API Endpoints

## Goal
CRUD endpoints for sessions and messages, auth-protected.

## Files to Create
- `backend/routers/__init__.py`
- `backend/routers/session_routes.py`

## Files to Modify
- `backend/main.py` — include session_router

## Endpoints
- GET /api/sessions — list user's sessions
- POST /api/sessions — create new session
- GET /api/sessions/{id}/messages — get messages for session
- PATCH /api/sessions/{id} — update session title
- DELETE /api/sessions/{id} — delete session and messages
- POST /api/chat — require auth (Authorization header)

## Steps
1. Create `backend/routers/session_routes.py` with all CRUD endpoints
2. All endpoints require `current_user = Depends(get_current_user)`
3. Ownership enforced by RLS policies (Supabase handles this)
4. Include router in main.py
5. Update /api/chat to require auth

## Verification
```bash
TOKEN="<from supabase login>"
curl http://localhost:8000/api/sessions -H "Authorization: Bearer $TOKEN"
```

## Rollback
Delete backend/routers/.
