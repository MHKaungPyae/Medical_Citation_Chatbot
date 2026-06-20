# Phase 3: Auth UI Components + Pages

## Goal
Build login and register pages with shared form components.

## Steps

### 1. Create `frontend/components/AuthInput.tsx`
Styled input with label and error message. Uses design tokens:
- Border: `border-warm-border`
- Text: `text-warm-gray`
- Placeholder: `placeholder:text-muted-warm`
- Focus: `focus:ring-teal-primary/40 focus:border-teal-primary`
- Error: `border-error-red text-error-red`

### 2. Create `frontend/components/AuthButton.tsx`
Submit button with loading state. Uses design tokens:
- Default: `bg-teal-primary text-white hover:bg-teal-dark`
- Disabled: `disabled:opacity-40 disabled:cursor-not-allowed`
- Loading: spinner or "Signing in..." text

### 3. Create `frontend/components/AuthCard.tsx`
Centered card layout. Uses design tokens:
- Background: `bg-cream-bg`
- Card: `bg-white border-warm-border rounded-2xl shadow-md`
- Title: `text-warm-gray`
- Subtitle: `text-muted-warm`

### 4. Create `frontend/app/login/page.tsx`
- Email + password fields using AuthInput
- Submit button using AuthButton
- Validation: email format, password not empty
- Error display from Supabase
- Link to `/register` using `text-teal-primary hover:text-teal-dark`
- Redirect to `/` on success using `useRouter()`

### 5. Create `frontend/app/register/page.tsx`
- Email + password + display name fields
- Validation: email format, password >= 8 chars
- Error display from Supabase
- Link to `/login`
- Redirect to `/` on success (or "check email" message)

## Verification
- Visit `/login` — form renders correctly
- Visit `/register` — form renders correctly
- Submit empty forms — validation errors appear
- Submit invalid email — email error
- Submit short password — length error

## Files Changed
- `frontend/components/AuthInput.tsx` (new)
- `frontend/components/AuthButton.tsx` (new)
- `frontend/components/AuthCard.tsx` (new)
- `frontend/app/login/page.tsx` (new)
- `frontend/app/register/page.tsx` (new)
