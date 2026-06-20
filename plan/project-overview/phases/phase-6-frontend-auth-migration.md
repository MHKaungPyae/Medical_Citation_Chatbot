# Phase 6: Frontend Auth & Session Migration

**Status:** ✅ Complete

## Goal
Add login/register pages, auth guard, and migrate frontend from localStorage to Supabase API.

## What Was Done
- Supabase client (`frontend/lib/supabase.ts`) with env var validation
- `authenticatedFetch` wrapper (`frontend/lib/api.ts`) — injects Supabase JWT
- Auth hook (`frontend/hooks/useAuth.ts`) — signIn, signUp, signOut, onAuthStateChange
- AuthProvider context (`frontend/components/AuthProvider.tsx`)
- Auth UI components: AuthCard, AuthInput, AuthButton
- Login page (`frontend/app/login/page.tsx`)
- Register page (`frontend/app/register/page.tsx`)
- User profile at sidebar bottom (ChatGPT-style) with sign-out dropdown
- Auth guard on main page (redirect to /login if unauthenticated)
- `useSessionStore.ts` rewritten: localStorage → API calls via authenticatedFetch
- `useChatController.ts` updated for async session operations
- `useChatStream.ts` uses authenticatedFetch for SSE

## Files Created
- `frontend/lib/supabase.ts`
- `frontend/lib/api.ts`
- `frontend/hooks/useAuth.ts`
- `frontend/components/AuthProvider.tsx`
- `frontend/components/AuthCard.tsx`
- `frontend/components/AuthInput.tsx`
- `frontend/components/AuthButton.tsx`
- `frontend/app/login/page.tsx`
- `frontend/app/register/page.tsx`
- `frontend/.env.local` (gitignored)

## Files Modified
- `frontend/app/layout.tsx` — wrapped with AuthProvider
- `frontend/app/page.tsx` — auth guard, passes user/signOut to Sidebar
- `frontend/components/Sidebar.tsx` — user profile at bottom
- `frontend/hooks/useSessionStore.ts` — complete rewrite to API calls
- `frontend/hooks/useChatController.ts` — async session operations
- `frontend/hooks/useChatStream.ts` — authenticatedFetch
- `frontend/lib/types.ts` — added AuthUser type
- `frontend/package.json` — added @supabase/supabase-js
