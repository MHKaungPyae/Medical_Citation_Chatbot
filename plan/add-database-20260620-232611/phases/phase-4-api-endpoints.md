# Phase 4: API Endpoints for Sessions and Messages

## Goal
Expose CRUD endpoints for chat sessions and message history so the frontend can manage sessions via API.

## Files to Create

### `backend/routers/session_routes.py`
All routes require auth (`get_current_user` dependency).

```
GET /api/sessions
  Response: list of { id, title, created_at, updated_at }

POST /api/sessions
  Body: { "title"?: str }
  Response: { id, title, created_at }

GET /api/sessions/{session_id}
  Response: { id, title, created_at, updated_at, messages: [...] }

PATCH /api/sessions/{session_id}
  Body: { "title": str }
  Response: { id, title, updated_at }

DELETE /api/sessions/{session_id}
  Response: { ok: true }
```

Authorization check: session must belong to the authenticated user, else 403.

### Pydantic response models
```python
class SessionSummary(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime

class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    citations: list[dict]
    created_at: datetime

class SessionDetail(SessionSummary):
    messages: list[MessageResponse]
```

## Files to Modify

### `backend/main.py`
- Import and include session router: `app.include_router(session_router, prefix="/api")`.

## Verification
```bash
TOKEN="<from login>"

# List sessions (empty initially)
curl -s http://localhost:8000/api/sessions -H "Authorization: Bearer $TOKEN"

# Create session
curl -s -X POST http://localhost:8000/api/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My First Chat"}'

# Get session detail with messages
curl -s http://localhost:8000/api/sessions/<id> -H "Authorization: Bearer $TOKEN"

# Delete session
curl -s -X DELETE http://localhost:8000/api/sessions/<id> -H "Authorization: Bearer $TOKEN"
```

## Done Criteria
- [ ] `backend/routers/session_routes.py` exists with all CRUD endpoints
- [ ] All endpoints require auth (401 without token)
- [ ] Session ownership enforced (403 if session belongs to another user)
- [ ] Messages include parsed citations (not raw JSON string)
- [ ] DELETE cascades to messages
