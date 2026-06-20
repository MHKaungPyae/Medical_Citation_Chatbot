# Phase 3: Auth Middleware

## Goal
Verify Supabase JWT tokens in FastAPI requests.

## Files to Create
- `backend/auth.py` — get_current_user dependency

## Files to Modify
- `backend/main.py` — add auth to /api/chat

## Steps
1. Create `backend/auth.py`:
   - `get_current_user(authorization: str = Header(...)) -> dict`
   - Verify JWT using Supabase JWT secret (from SUPABASE_JWT_SECRET env var)
   - Return user dict with `id`, `email`
2. The Supabase JWT secret is in Dashboard → Settings → API → JWT Secret
3. Use `python-jose` to verify tokens (already a dependency from the original plan, or use jwt.decode)

## Verification
```bash
# Login via Supabase, get token, verify it works
curl http://localhost:8000/api/sessions -H "Authorization: Bearer <supabase_token>"
```

## Rollback
Delete backend/auth.py.
