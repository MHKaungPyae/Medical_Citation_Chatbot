'use client';

import { useCallback, useState } from 'react';
import type { Session, Message } from '@/lib/types';
import { API_URL } from '@/lib/constants';
import { authenticatedFetch } from '@/lib/api';
import { truncateTitle } from '@/lib/utils';

// ── API helpers ─────────────────────────────────────────────────────────

async function fetchSessions(): Promise<Session[]> {
  const res = await authenticatedFetch(`${API_URL}/api/sessions`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((s: Record<string, string>) => ({
    id: s.id,
    title: s.title,
    createdAt: new Date(s.created_at).getTime(),
    updatedAt: new Date(s.updated_at).getTime(),
    messages: [],
  }));
}

async function fetchMessages(sessionId: string): Promise<Message[]> {
  const res = await authenticatedFetch(`${API_URL}/api/sessions/${sessionId}/messages`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((m: Record<string, unknown>) => ({
    id: m.id as string,
    role: m.role as 'user' | 'assistant',
    content: m.content as string,
    citations: m.citations_json ? JSON.parse(m.citations_json as string) : [],
    status: 'done' as const,
  }));
}

async function createSessionApi(title: string): Promise<Session | null> {
  const res = await authenticatedFetch(`${API_URL}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) return null;
  const s = await res.json();
  return {
    id: s.id,
    title: s.title,
    createdAt: new Date(s.created_at).getTime(),
    updatedAt: new Date(s.updated_at).getTime(),
    messages: [],
  };
}

async function deleteSessionApi(sessionId: string): Promise<boolean> {
  const res = await authenticatedFetch(`${API_URL}/api/sessions/${sessionId}`, {
    method: 'DELETE',
  });
  return res.ok;
}

async function updateSessionTitleApi(sessionId: string, title: string): Promise<boolean> {
  const res = await authenticatedFetch(`${API_URL}/api/sessions/${sessionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  return res.ok;
}

// ── hook ────────────────────────────────────────────────────────────────

export function useSessionStore() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');

  const loadSessions = useCallback(async () => {
    const loaded = await fetchSessions();
    setSessions(loaded);
    return loaded;
  }, []);

  const updateSessionInStore = useCallback(
    async (sessionId: string, messages: Message[]) => {
      const title = messages.find((m) => m.role === 'user')?.content || 'New Chat';
      const truncatedTitle = truncateTitle(title);
      const now = Date.now();

      setSessions((prev) => {
        const existing = prev.find((s) => s.id === sessionId);
        if (existing) {
          return prev.map((s) =>
            s.id === sessionId
              ? { ...s, title: truncatedTitle, updatedAt: now, messages }
              : s,
          );
        }
        return [
          {
            id: sessionId,
            title: truncatedTitle,
            createdAt: now,
            updatedAt: now,
            messages,
          },
          ...prev,
        ];
      });

      // Update title on server
      await updateSessionTitleApi(sessionId, truncatedTitle);
    },
    [],
  );

  const newSession = useCallback(async () => {
    const session = await createSessionApi('New Chat');
    if (session) {
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      return session.id;
    }
    // Fallback: generate local ID
    const fallbackId = crypto.randomUUID();
    setActiveSessionId(fallbackId);
    return fallbackId;
  }, []);

  const switchSession = useCallback(async (sessionId: string): Promise<Session | null> => {
    setActiveSessionId(sessionId);
    const messages = await fetchMessages(sessionId);
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, messages } : s)),
    );
    // Return the session with freshly fetched messages, not the stale state object
    return { id: sessionId, title: '', createdAt: 0, updatedAt: 0, messages } as Session;
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    await deleteSessionApi(sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  }, []);

  return {
    sessions,
    activeSessionId,
    setActiveSessionId,
    loadSessions,
    updateSessionInStore,
    newSession,
    switchSession,
    deleteSession,
  };
}
