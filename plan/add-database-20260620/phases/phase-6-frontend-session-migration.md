# Phase 6: Frontend Session Migration

## Goal
Replace localStorage with API calls for session/message persistence.

## Files to Modify
- `frontend/hooks/useSessionStore.ts` — rewrite to use API
- `frontend/hooks/useChatController.ts` — pass auth, use API
- `frontend/hooks/useChatStream.ts` — add auth header to SSE fetch
- `frontend/lib/constants.ts` — remove STORAGE_KEYS

## Steps
1. Rewrite useSessionStore.ts:
   - `loadSessions()` → GET /api/sessions
   - `switchSession(id)` → GET /api/sessions/{id}/messages
   - `deleteSession(id)` → DELETE /api/sessions/{id}
   - `newSession()` → POST /api/sessions
   - Remove all localStorage code
2. Update useChatController.ts to get auth token from useAuth
3. Update useChatStream.ts to include Authorization header
4. Add one-time localStorage import on first login (read old sessions, POST to API)
5. Remove STORAGE_KEYS from constants.ts

## Verification
- Login, send messages, refresh — messages should persist
- Open in different browser — different user, different sessions
- Restart server — messages should survive

## Rollback
Revert to localStorage-based useSessionStore.
