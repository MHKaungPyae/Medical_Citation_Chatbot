# Phase 5: Frontend Auth

## Goal
Login/register using Supabase Auth, auth-aware API client.

## Files to Create
- `frontend/lib/supabase.ts` — Supabase client singleton
- `frontend/lib/api.ts` — fetch wrapper with auth headers
- `frontend/hooks/useAuth.ts` — login, register, logout, session state
- `frontend/app/login/page.tsx`
- `frontend/app/register/page.tsx`
- `frontend/components/AuthProvider.tsx`

## Files to Modify
- `frontend/lib/types.ts` — add User type
- `frontend/app/layout.tsx` — wrap with AuthProvider

## Steps
1. Install `@supabase/supabase-js` in frontend
2. Create `frontend/lib/supabase.ts` with Supabase client (env vars via NEXT_PUBLIC_)
3. Create `frontend/lib/api.ts` — fetch wrapper that adds Authorization header
4. Create `frontend/hooks/useAuth.ts`:
   - `signUp(email, password)` → supabase.auth.signUp
   - `signIn(email, password)` → supabase.auth.signInWithPassword
   - `signOut()` → supabase.auth.signOut
   - `user` state from supabase.auth.onAuthStateChange
5. Create login and register pages
6. Create AuthProvider context
7. Wrap layout with AuthProvider
8. Redirect to /login if not authenticated

## Verification
- Navigate to /register, create account
- Should redirect to main chat page
- Refresh — should stay logged in
- Logout — should redirect to /login

## Rollback
Delete new files, revert layout.tsx.
