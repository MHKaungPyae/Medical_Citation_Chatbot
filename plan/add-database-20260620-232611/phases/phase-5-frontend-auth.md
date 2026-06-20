# Phase 5: Frontend Auth UI

## Goal
Add login/register pages and auth token management to the frontend.

## Files to Create

### `frontend/lib/api.ts`
- `apiFetch(path: string, options?: RequestInit)` — wrapper around `fetch` that:
  - Prepends `API_URL` to path.
  - Injects `Authorization: Bearer <token>` header from localStorage.
  - Handles 401 by redirecting to `/login`.
  - Returns parsed JSON or throws.

### `frontend/hooks/useAuth.ts`
- `useAuth()` hook:
  - `user: { id, email } | null`
  - `token: string | null`
  - `login(email, password)` — calls API, stores token, sets user.
  - `register(email, password, displayName?)` — calls API, stores token, sets user.
  - `logout()` — clears token, redirects to `/login`.
  - `isAuthenticated: boolean`
  - Initializes from localStorage on mount.

### `frontend/app/login/page.tsx`
- Email + password form.
- Link to register page.
- Error display for invalid credentials.
- Redirect to `/` on success.

### `frontend/app/register/page.tsx`
- Email + password + display name form.
- Link to login page.
- Error display for duplicate email.
- Redirect to `/` on success.

### `frontend/components/AuthProvider.tsx`
- React context provider wrapping `useAuth`.
- Makes `user`, `token`, `login`, `logout` available via context.
- Redirects to `/login` if not authenticated (except on login/register pages).

## Files to Modify

### `frontend/lib/constants.ts`
Add:
```typescript
export const AUTH_TOKEN_KEY = 'medical-chatbot-auth-token';
export const AUTH_USER_KEY = 'medical-chatbot-auth-user';
```

### `frontend/lib/types.ts`
Add:
```typescript
export interface User {
  id: string;
  email: string;
  displayName?: string;
}
```

### `frontend/app/layout.tsx`
- Wrap children with `AuthProvider`.

## Verification
- Navigate to `/login` — form renders
- Click "Register" link — navigates to `/register`
- Register new user — redirects to chat
- Refresh page — stays logged in
- Click logout — redirects to `/login`
- Try registering with same email — shows error
- Try login with wrong password — shows error

## Done Criteria
- [ ] `frontend/lib/api.ts` exists with auth-aware fetch wrapper
- [ ] `frontend/hooks/useAuth.ts` exists with login/register/logout
- [ ] `/login` and `/register` pages render and function
- [ ] Auth token persists across page refresh
- [ ] Unauthenticated users redirected to `/login`
