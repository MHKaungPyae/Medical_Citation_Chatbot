# Phase 3: Backend Session Store Migration

## Goal
Replace the in-memory `SessionStore` with a database-backed implementation while preserving the existing interface used by `symptom_pipeline.py`.

## Files to Modify

### `backend/session_store.py`
Complete rewrite. The new implementation must preserve:
- `get_history(session_id: str) -> str` — returns formatted conversation history for LLM prompt
- `save(session_id: str, role: str, content: str) -> None` — appends a message

New methods to add:
- `async get_sessions(user_id: str) -> list[dict]` — list user's sessions
- `async get_session_messages(session_id: str) -> list[dict]` — get messages for a session
- `async create_session(user_id: str, title: str = "New Chat") -> str` — create session, return ID
- `async delete_session(session_id: str) -> bool` — delete session and its messages

**Important:** The `get_history` and `save` methods are called from `symptom_pipeline.py` which is async. However, `get_history` is currently synchronous. Since `symptom_pipeline.py` is already async, making these methods async is safe — just need to update the call sites in `symptom_pipeline.py` to use `await`.

### `backend/symptom_pipeline.py`
Minimal changes — update the two call sites to await the async session store:
```python
# Line 397: history = session_store.get_history(session_id)
history = await session_store.get_history(session_id)

# Lines 445-446: session_store.save(...)
await session_store.save(session_id, "user", query)
await session_store.save(session_id, "assistant", full_text)
```

### `backend/main.py`
- The `/api/chat` endpoint may need to pass `user_id` from auth to the pipeline.
- Add auth dependency to `/api/chat` endpoint.

## Design: DB-Backed SessionStore

```python
class DBSessionStore:
    async def get_history(self, session_id: str) -> str:
        """Query last N messages from DB, format as 'User: ...\nAssistant: ...'"""
        
    async def save(self, session_id: str, role: str, content: str) -> None:
        """Insert message into messages table."""
        
    async def get_sessions(self, user_id: str) -> list[dict]:
        """Return list of sessions for a user."""
        
    async def get_session_messages(self, session_id: str) -> list[dict]:
        """Return messages for a session."""
        
    async def create_session(self, user_id: str, title: str = "New Chat") -> str:
        """Create a new session, return its ID."""
        
    async def delete_session(self, session_id: str) -> bool:
        """Delete session and cascade-delete messages."""

session_store = DBSessionStore()
```

## Verification
```bash
# Send a chat message with auth
TOKEN="<from login>"
curl -N -X POST http://localhost:8000/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"What is aspirin?","session_id":"test-123"}'

# Check DB
python -c "
import sqlite3
conn = sqlite3.connect('backend/chatbot.db')
msgs = conn.execute('SELECT role, substr(content, 1, 50) FROM messages').fetchall()
for m in msgs: print(m)
conn.close()
"
```

## Done Criteria
- [ ] `session_store.py` rewritten to use SQLAlchemy async
- [ ] `symptom_pipeline.py` updated with `await` on session store calls
- [ ] SSE streaming still works end-to-end
- [ ] Messages persist in SQLite after server restart
- [ ] `get_history()` returns last N messages formatted for LLM prompt
