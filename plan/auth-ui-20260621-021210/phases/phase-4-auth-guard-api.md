# Phase 4: Auth Guard + API Integration

## Goal
Protect routes and inject auth token into API requests.

## Steps

### 1. Create `frontend/lib/api.ts`
Shared fetch wrapper that injects Supabase session token:
```typescript
import { supabase } from '@/lib/supabase';
import { API_URL } from '@/lib/constants';

export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers = new Headers(options.headers);
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  return fetch(url, { ...options, headers });
}
```

### 2. Modify `frontend/app/page.tsx`
Add auth guard at the top of the component:
```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/AuthProvider';
// ... existing imports

export default function Home() {
  const { user, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-cream-bg">
        <p className="text-muted-warm">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  // ... existing component logic
}
```

### 3. Modify `frontend/hooks/useChatStream.ts`
Replace `fetch()` with `authenticatedFetch()`:
```typescript
import { authenticatedFetch } from '@/lib/api';

// In sendMessage function, replace:
//   const response = await fetch(`${API_URL}/api/chat`, { ... });
// With:
//   const response = await authenticatedFetch(`${API_URL}/api/chat`, { ... });
```

## Verification
- Visit `/` while logged out — redirects to `/login`
- Login — redirects to `/`, chat works
- Send a message — API call includes auth header
- Refresh page — stays logged in

## Files Changed
- `frontend/lib/api.ts` (new)
- `frontend/app/page.tsx` (add auth guard)
- `frontend/hooks/useChatStream.ts` (use authenticatedFetch)
