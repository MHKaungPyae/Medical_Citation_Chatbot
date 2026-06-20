# Phase 7: Cleanup and Testing

## Goal
Remove obsolete code, run full E2E verification.

## Steps
1. Remove old in-memory session store code
2. Remove localStorage session code
3. Remove STORAGE_KEYS from constants.ts
4. Update CLAUDE.md with new architecture
5. Update SKILL.md with Supabase info

## E2E Test Sequence
1. Register new user via Supabase Auth
2. Login
3. Send a medical question — verify citations work
4. Refresh page — verify messages persist
5. Create new session — verify it appears in sidebar
6. Switch sessions — verify correct messages load
7. Delete session — verify it's gone
8. Restart server — verify data survives
9. Logout and login — verify sessions are there
10. Register second user — verify isolation (can't see other's sessions)

## Verification Commands
```bash
# Full stack test
PYTHONPATH=. uvicorn backend.main:app --reload --port 8000
cd frontend && npm run dev

# Check Supabase dashboard for tables and data
```
