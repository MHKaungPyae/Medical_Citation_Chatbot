# Existing Code Patterns

## Design Tokens (`frontend/app/globals.css`)
All colors defined as CSS custom properties under `@theme inline`:
- `--color-teal-primary: #14b8a6` — primary actions
- `--color-teal-light: #d4f7f0` — hover backgrounds
- `--color-teal-dark: #0f766e` — emphasis
- `--color-amber-light: #fef3c7` — citation highlights
- `--color-amber-dark: #92400e` — citation text
- `--color-cream-bg: #faf5f0` — page background
- `--color-warm-gray: #44403c` — body text
- `--color-muted-warm: #a1887f` — secondary text
- `--color-warm-border: #e8d5c4` — borders
- `--color-error-red: #dc2626` — error text
- `--color-error-bg: #fef2f2` — error backgrounds

## Component Conventions
- All interactive components: `'use client'` directive
- Props: TypeScript interfaces defined above component
- Buttons: `rounded-xl` or `rounded-lg`, `transition-all hover:` states
- Primary CTA: `bg-teal-primary text-white hover:bg-teal-dark hover:shadow-md`
- Cards: `bg-white border border-warm-border rounded-2xl shadow-sm`
- Inputs: `border border-warm-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-teal-primary/40`

## Layout (`frontend/app/layout.tsx`)
Minimal wrapper: `<html lang="en" className="h-full">` + `<body className="h-full antialiased">`.
No shared nav — sidebar is page-specific.

## API Pattern (`frontend/hooks/useChatStream.ts`)
Uses `fetch()` with `${API_URL}/api/chat`. No auth headers currently.
`API_URL` from `constants.ts`: `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'`.

## Existing Auth State
No existing auth code. No Supabase dependency in `package.json`.
Existing database plan uses JWT + SQLite (different approach from Supabase).
