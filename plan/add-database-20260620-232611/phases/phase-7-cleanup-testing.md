# Phase 7: Cleanup and End-to-End Testing

## Goal
Remove obsolete code, verify the full flow works end-to-end, and ensure nothing is broken.

## Cleanup Tasks

### Files to Remove
- `backend/rxnav_client.py` — already unwired, no longer needed. (Optional — can keep for reference.)

### Code to Clean Up
- Remove `SESSION_TTL_SECONDS` from `backend/config.py` (TTL is now implicit — sessions persist forever in DB).
- Remove `_prune_interval`, `_timestamps`, `_prune()`, `_maybe_prune()` from old session store (already replaced in Phase 3).
- Remove `STORAGE_KEYS.SESSIONS` and `STORAGE_KEYS.ACTIVE_SESSION` from `frontend/lib/constants.ts` (already done in Phase 6).

### Files to Verify Unchanged
These files should NOT have been modified by the database work:
- `backend/wiki_client.py`
- `backend/openfda_client.py`
- `backend/retry.py`
- `backend/logging_setup.py`
- `frontend/components/MessageBubble.tsx`
- `frontend/components/InlineCitation.tsx`
- `frontend/components/CitationPill.tsx`
- `frontend/components/MessageList.tsx`
- `frontend/components/Sidebar.tsx` (unless auth UI was added here)

## End-to-End Test Plan

### Setup
```bash
cd /Users/panda/Desktop/Medical_Citation_Chatbot
rm -f backend/chatbot.db
source backend/.venv/bin/activate
alembic upgrade head
PYTHONPATH=. uvicorn backend.main:app --reload --port 8000
# In another terminal:
cd frontend && npm run dev
```

### Test Sequence
1. **Register** — Navigate to `/register`, create account. Verify redirect to chat.
2. **Ask a medical question** — Type "What are the side effects of aspirin?" and send.
3. **Verify SSE streaming** — Tokens appear one by one, citations render as badges.
4. **Verify DB persistence** — Check SQLite:
   ```bash
   sqlite3 backend/chatbot.db "SELECT role, substr(content,1,60) FROM messages;"
   ```
5. **Refresh page** — Message history loads from API.
6. **Create new session** — Click "New Chat" in sidebar.
7. **Switch sessions** — Click first session, verify messages load.
8. **Delete session** — Delete the first session, verify it disappears.
9. **Restart backend** — Kill and restart uvicorn. Verify data persists.
10. **Logout and re-login** — Verify sessions are still there.
11. **Second user** — Register a different email. Verify sessions are isolated.

### Regression Checks
- Citation markers `[[CITATION:N]]` still render as inline badges.
- Wikipedia and OpenFDA data still fetched and displayed.
- Medical disclaimer still appears in responses.
- SSE events (token, citation, done, warning, info) all function.
- Error handling (empty query, Ollama down) still works.

## Done Criteria
- [ ] All 11 E2E test steps pass
- [ ] All regression checks pass
- [ ] No `localStorage` usage for sessions remains
- [ ] No in-memory session store remains
- [ ] All backend imports are absolute (`from backend.xxx`)
- [ ] `find backend -type d -name __pycache__ -exec rm -rf {} +` works
- [ ] `alembic upgrade head` on fresh DB creates all tables
