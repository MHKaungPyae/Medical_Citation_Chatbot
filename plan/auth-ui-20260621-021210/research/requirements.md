# Requirements

## Pages
1. Login page at `/login`
2. Register page at `/register`

## Form Fields
- **Login:** email, password
- **Register:** email, password, display name (optional)

## Validation
- Email: valid email format
- Password: minimum 8 characters
- Display name: optional, no validation needed

## Error Handling
- Supabase auth errors displayed to user
- Network errors caught and displayed
- Validation errors shown per-field

## Loading States
- Button disabled during API call
- Button text changes (e.g., "Signing in...")
- Optional: spinner icon

## Navigation
- Login page has link to register
- Register page has link to login
- Successful auth redirects to `/`
- Unauthenticated users redirected to `/login`

## Supabase Auth
- Use `@supabase/supabase-js` client library
- `signInWithPassword()` for login
- `signUp()` for register
- `onAuthStateChange()` for session management
- Session token injected into API requests via `Authorization` header

## Design Tokens
Must use existing tokens from `globals.css` — no new colors.
