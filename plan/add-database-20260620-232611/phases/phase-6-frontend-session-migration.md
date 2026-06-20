# Phase 6: Frontend Session Migration

## Goal
Replace localStorage session management with API calls so sessions are server-persisted and tied to the authenticated user.

## Files to Modify

### `frontend/hooks/useSessionStore.ts`
Major rewrite:
- Remove all `localStorage` read/write logic.
- Replace with API calls via `apiFetch`:
  - `loadSessions()` → `GET /api/sessions`
  - `createSession(title)` → `POST /api/sessions`
  - `deleteSession(id)` → `DELETE /api/sessions/{id}`
  - `loadSessionMessages(id)` → `GET /api/sessions/{id}`
  - `saveMessages(sessionId, messages)` → handled by backend during streaming (no explicit call needed)
- Keep the same hook return interface so `useChatController.ts` needs minimal changes.

### `frontend/hooks/useChatController.ts`
- Pass auth token to `useChatStream` for SSE requests.
- Update `handleNewChat` to call API to create session.
- Update `handleDeleteSession` to call API to delete session.
- Update `handleSwitchSession` to fetch messages from API.
- Remove debounced localStorage persistence (backend handles persistence during streaming).

### `frontend/hooks/useChatStream.ts`
- Add `Authorization: Bearer <token>` header to the SSE fetch request.
- Pass token as a parameter from `useChatController`.

### `frontend/lib/constants.ts`
- Remove `STORAGE_KEYS.SESSIONS` and `STORAGE_KEYS.ACTIVE_SESSION` (no longer needed).
- Keep `AUTH_TOKEN_KEY` and `AUTH_USER_KEY`.

## Migration Strategy for Existing localStorage Data

On first login after the database migration:
1. Check if `localStorage.getItem('medical-chatbot-sessions')` has data.
2. If yes, show a banner: "You have X local conversations. Import them to your account?"
3. If user accepts, POST each session's messages to the API.
4. After import (or if user declines), clear localStorage session keys.
5. If no localStorage data, skip entirely.

This is a one-time migration path — implement in a `useMigrationCheck` hook or as part of `useAuth` initialization.

## Verification
- Login → sidebar shows sessions from API (empty initially)
- Send a message → session created in DB, appears in sidebar
- Refresh page → message history loads from API
- Switch sessions → correct messages load
- Delete session → removed from sidebar and DB
- Logout → login with same user → sessions persist

## Done Criteria
- [ ] `useSessionStore.ts` uses API calls instead of localStorage
- [ ] `useChatStream.ts` includes auth header
- [ ] Sessions persist across page refresh and server restart
- [ ] Session switching loads messages from API
- [ ] Old localStorage data migration works (if applicable)
