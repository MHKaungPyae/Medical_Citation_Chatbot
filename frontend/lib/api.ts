import { supabase } from './supabase';

/**
 * Fetch with Supabase auth token injected.
 * Returns the raw Response so callers can handle streaming.
 * On 401, attempts a single token refresh and retries the request.
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();

  const headers = new Headers(options.headers);
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  const response = await fetch(url, { ...options, headers });

  // If 401, try refreshing the token once and retry
  if (response.status === 401) {
    const { data: { session: refreshed } } = await supabase.auth.refreshSession();
    if (refreshed?.access_token && refreshed.access_token !== session?.access_token) {
      const retryHeaders = new Headers(options.headers);
      retryHeaders.set('Authorization', `Bearer ${refreshed.access_token}`);
      return fetch(url, { ...options, headers: retryHeaders });
    }
  }

  return response;
}
