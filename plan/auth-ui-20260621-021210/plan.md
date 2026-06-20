# Implementation Plan: Auth UI Pages (Supabase Auth)

## Goal
Add login and register pages to the Medical Citation Chatbot frontend, using Supabase Auth for authentication, styled with the project's existing Tailwind design tokens.

---

## Acceptance Criteria
1. `/login` page renders a centered card with email + password fields, submit button, and link to register.
2. `/register` page renders a centered card with email + password + display name fields, submit button, and link to login.
3. Both pages use existing color tokens: `teal-primary`, `teal-dark`, `cream-bg`, `warm-gray`, `muted-warm`, `warm-border`, `error-red`, `error-bg`.
4. Form validation: email format check, password minimum 8 characters.
5. Error messages display in `error-red` on `error-bg` background.
6. Loading state shows a spinner or disabled button during API calls.
7. Successful auth redirects to `/` (chat page).
8. AuthProvider wraps the app and exposes `useAuth()` hook.
9. `api.ts` wrapper injects Supabase session token into API requests.
10. Unauthenticated users visiting `/` are redirected to `/login`.

---

## Existing Patterns

### Design Tokens (from `frontend/app/globals.css`)
```
--color-teal-primary: #14b8a6    (primary CTA, links)
--color-teal-light: #d4f7f0      (hover backgrounds, selected states)
--color-teal-dark: #0f766e       (hover CTA, emphasis text)
--color-amber-light: #fef3c7     (citation highlights)
--color-amber-dark: #92400e      (citation text)
--color-cream-bg: #faf5f0        (page background)
--color-warm-gray: #44403c       (body text)
--color-muted-warm: #a1887f      (secondary text, placeholders)
--color-warm-border: #e8d5c4     (borders, dividers)
--color-error-red: #dc2626       (error text)
--color-error-bg: #fef2f2        (error background)
--color-warning-yellow: #f59e0b  (warning icon)
--color-warning-bg: #fffbeb      (warning background)
```

### Component Patterns
- All interactive components use `'use client'` directive.
- Props defined as TypeScript interfaces above the component.
- Buttons use `rounded-xl` or `rounded-lg` with `transition-all hover:` states.
- Primary buttons: `bg-teal-primary text-white hover:bg-teal-dark hover:shadow-md`.
- Secondary/ghost buttons: `text-teal-dark hover:bg-teal-light`.
- Cards/panels: `bg-white border border-warm-border rounded-2xl shadow-sm`.
- Error states: `text-error-red bg-error-bg border border-error-red/20 rounded-lg px-4 py-3`.
- Inputs: `border border-warm-border rounded-lg px-4 py-2.5 text-warm-gray placeholder:text-muted-warm focus:outline-none focus:ring-2 focus:ring-teal-primary/40 focus:border-teal-primary`.

### Layout Pattern
- `layout.tsx` is minimal: `<html>` + `<body>` with `h-full antialiased`.
- Page-level components handle their own full-height layout.
- No shared navigation bar — the sidebar is page-specific.

### API Pattern
- `useChatStream.ts` uses `fetch()` with `${API_URL}/api/chat`.
- `API_URL` from `constants.ts`: `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'`.
- No auth headers currently — this plan adds them.

---

## Files to Change

### New Files
| File | Purpose |
|------|---------|
| `frontend/lib/supabase.ts` | Supabase client singleton |
| `frontend/hooks/useAuth.ts` | Auth state hook (user, session, loading) |
| `frontend/components/AuthProvider.tsx` | React context provider for auth |
| `frontend/app/login/page.tsx` | Login page |
| `frontend/app/register/page.tsx` | Register page |
| `frontend/components/AuthCard.tsx` | Shared auth form card layout |
| `frontend/components/AuthInput.tsx` | Styled input with label + error |
| `frontend/components/AuthButton.tsx` | Submit button with loading state |

### Modified Files
| File | Change |
|------|--------|
| `frontend/package.json` | Add `@supabase/supabase-js` dependency |
| `frontend/lib/types.ts` | Add `AuthUser` type |
| `frontend/lib/constants.ts` | Add `SUPABASE_URL`, `SUPABASE_ANON_KEY` env var refs |
| `frontend/app/layout.tsx` | Wrap children in `AuthProvider` |
| `frontend/app/page.tsx` | Add auth guard (redirect if not logged in) |
| `frontend/hooks/useChatStream.ts` | Include auth token in fetch headers |
| `frontend/lib/api.ts` | New file — shared fetch wrapper with token injection |

---

## Color Token Usage Map

### Login/Register Pages
| Element | Token |
|---------|-------|
| Page background | `bg-cream-bg` |
| Card background | `bg-white` |
| Card border | `border-warm-border` |
| Card shadow | `shadow-sm` or `shadow-md` |
| Page title | `text-warm-gray` |
| Subtitle/description | `text-muted-warm` |
| Input border | `border-warm-border` |
| Input text | `text-warm-gray` |
| Input placeholder | `placeholder:text-muted-warm` |
| Input focus ring | `focus:ring-teal-primary/40 focus:border-teal-primary` |
| Input label | `text-warm-gray` |
| Primary button | `bg-teal-primary text-white hover:bg-teal-dark` |
| Button disabled | `disabled:opacity-40 disabled:cursor-not-allowed` |
| Error text | `text-error-red` |
| Error background | `bg-error-bg` |
| Error border | `border-error-red/20` |
| Link text | `text-teal-primary hover:text-teal-dark` |
| Divider | `border-warm-border` |

---

## Phase Plan

### Phase 1: Supabase Client + Types
**Goal:** Install Supabase SDK, create client singleton, add types.

**Steps:**
1. `cd frontend && npm install @supabase/supabase-js`
2. Create `frontend/lib/supabase.ts` — Supabase client using env vars
3. Add `AuthUser` type to `frontend/lib/types.ts`
4. Add Supabase env var constants to `frontend/lib/constants.ts`

**Verification:**
```bash
cd /Users/panda/Desktop/Medical_Citation_Chatbot/frontend
npm run build
# Should compile without errors
```

---

### Phase 2: Auth Hook + Provider
**Goal:** Create auth state management and context provider.

**Steps:**
1. Create `frontend/hooks/useAuth.ts`:
   - `user: AuthUser | null`
   - `session: Session | null` (Supabase session)
   - `loading: boolean`
   - `signIn(email, password)` — calls `supabase.auth.signInWithPassword`
   - `signUp(email, password, displayName)` — calls `supabase.auth.signUp`
   - `signOut()` — calls `supabase.auth.signOut`
   - Listens to `onAuthStateChange` for session updates
2. Create `frontend/components/AuthProvider.tsx`:
   - React context wrapping `useAuth` state
   - Exposes `useAuthContext()` hook
3. Modify `frontend/app/layout.tsx`:
   - Wrap `{children}` in `<AuthProvider>`

**Verification:**
```bash
cd /Users/panda/Desktop/Medical_Citation_Chatbot/frontend
npm run build
# Should compile without errors
```

---

### Phase 3: Auth UI Components + Pages
**Goal:** Build login and register pages with shared components.

**Steps:**
1. Create `frontend/components/AuthInput.tsx`:
   - Props: `label`, `type`, `value`, `onChange`, `error`, `placeholder`, `disabled`
   - Styled with design tokens
2. Create `frontend/components/AuthButton.tsx`:
   - Props: `children`, `type`, `loading`, `disabled`
   - Loading state: spinner icon or "Signing in..." text
3. Create `frontend/components/AuthCard.tsx`:
   - Props: `children`, `title`, `subtitle`
   - Centered card layout on cream-bg background
4. Create `frontend/app/login/page.tsx`:
   - Email + password fields
   - Validation: email format, password not empty
   - Error display from Supabase
   - Link to `/register`
   - Redirect to `/` on success
5. Create `frontend/app/register/page.tsx`:
   - Email + password + display name fields
   - Validation: email format, password >= 8 chars
   - Error display from Supabase
   - Link to `/login`
   - Redirect to `/` on success (or show "check email" if email confirmation enabled)

**Verification:**
- Navigate to `http://localhost:3000/login` — form renders with correct styling
- Navigate to `http://localhost:3000/register` — form renders with correct styling
- Submit empty form — validation errors appear
- Submit invalid email — email format error
- Submit short password — length error

---

### Phase 4: Auth Guard + API Integration
**Goal:** Protect routes and inject auth token into API calls.

**Steps:**
1. Modify `frontend/app/page.tsx`:
   - Add auth guard: if `!user && !loading`, redirect to `/login`
   - Show loading skeleton while auth state resolves
2. Create `frontend/lib/api.ts`:
   - `authenticatedFetch(url, options)` — gets session from Supabase, injects `Authorization: Bearer <token>` header
   - Export for use by other hooks
3. Modify `frontend/hooks/useChatStream.ts`:
   - Import `authenticatedFetch` from `api.ts`
   - Replace raw `fetch()` with `authenticatedFetch()`

**Verification:**
- Visit `/` while logged out — redirects to `/login`
- Login — redirects to `/`, chat works
- Send a message — API call includes auth header
- Refresh page — stays logged in (Supabase session persists)

---

## Risks and Unknowns

| Risk | Impact | Mitigation |
|------|--------|------------|
| Supabase email confirmation enabled by default | High | Check Supabase dashboard setting; if enabled, show "check your email" message after register |
| Supabase env vars not set | High | Add fallback error message; document required env vars in README |
| Breaking existing SSE streaming | High | Only modify the fetch call in `useChatStream.ts`, preserve all other logic |
| Session persistence across page loads | Medium | Supabase handles this automatically via `onAuthStateChange` |
| Rate limiting on Supabase free tier | Low | Not a concern for development; document for production |

## Assumptions
- Supabase project will be created separately (not part of this plan).
- Email confirmation may or may not be enabled — the UI should handle both cases.
- No OAuth/social login initially.
- No password reset flow initially (can add later).
- The existing `session_store` interface stays the same — auth is additive.

## Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

---

## Verification

### Build Check
```bash
cd /Users/panda/Desktop/Medical_Citation_Chatbot/frontend
npm run build
```

### Visual Check
1. `npm run dev`
2. Visit `http://localhost:3000/login` — verify card renders, inputs styled, button works
3. Visit `http://localhost:3000/register` — verify card renders, inputs styled, button works
4. Submit empty forms — verify validation errors
5. Submit with invalid email — verify email error
6. Submit with short password — verify length error

### Auth Flow Check
1. Register a new user at `/register`
2. Should redirect to `/` (or show "check email" if confirmation enabled)
3. Login at `/login`
4. Should redirect to `/`
5. Refresh page — should stay logged in
6. Visit `/` in incognito — should redirect to `/login`

---

## Recommended First Implementation Step
**Phase 1: Supabase Client + Types**

Install the SDK, create the client singleton, and add the type definitions. This is the foundation everything else depends on and has zero risk of breaking existing functionality.

```bash
cd /Users/panda/Desktop/Medical_Citation_Chatbot/frontend
npm install @supabase/supabase-js
```

Then create `frontend/lib/supabase.ts` with the client initialization.
