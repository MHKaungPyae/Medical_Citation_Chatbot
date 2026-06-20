# Phase 1: Supabase Client + Types

## Goal
Install Supabase SDK, create client singleton, add auth types.

## Steps

### 1. Install Supabase SDK
```bash
cd /Users/panda/Desktop/Medical_Citation_Chatbot/frontend
npm install @supabase/supabase-js
```

### 2. Create `frontend/lib/supabase.ts`
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 3. Add type to `frontend/lib/types.ts`
```typescript
export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
}
```

### 4. Add constants to `frontend/lib/constants.ts`
```typescript
export const AUTH_TOKEN_KEY = 'medical-chatbot-auth-token';
```

## Verification
```bash
cd /Users/panda/Desktop/Medical_Citation_Chatbot/frontend
npm run build
# Should compile without errors
```

## Files Changed
- `frontend/package.json` (new dependency)
- `frontend/lib/supabase.ts` (new file)
- `frontend/lib/types.ts` (add AuthUser)
- `frontend/lib/constants.ts` (add AUTH_TOKEN_KEY)
