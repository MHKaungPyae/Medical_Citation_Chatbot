'use client';

import { useCallback, useState, useEffect } from 'react';
import type { Session, Message } from '@/lib/types';
import { STORAGE_KEYS } from '@/lib/constants';
import { generateUUID, truncateTitle } from '@/lib/utils';

function loadSessions(): Session[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: Session[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  } catch {
    // localStorage full or unavailable
  }
}

function loadActiveSessionId(): string {
  if (typeof window === 'undefined') return generateUUID();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
    return raw || generateUUID();
  } catch {
    return generateUUID();
  }
}

function saveActiveSessionId(id: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, id);
  } catch {}
}

export function useSessionStore() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');

  useEffect(() => {
    setSessions(loadSessions());
    setActiveSessionId(loadActiveSessionId());
  }, []);

  const updateSessionInStore = useCallback(
    (sessionId: string, messages: Message[]) => {
      setSessions((prev) => {
        const existing = prev.find((s) => s.id === sessionId);
        const title =
          messages.find((m) => m.role === 'user')?.content || 'New Chat';
        const now = Date.now();

        let updated: Session[];
        if (existing) {
          updated = prev.map((s) =>
            s.id === sessionId
              ? { ...s, title: truncateTitle(title), updatedAt: now, messages }
              : s
          );
        } else {
          updated = [
            {
              id: sessionId,
              title: truncateTitle(title),
              createdAt: now,
              updatedAt: now,
              messages,
            },
            ...prev,
          ];
        }

        saveSessions(updated);
        return updated;
      });
    },
    []
  );

  const newSession = useCallback(() => {
    const id = generateUUID();
    setActiveSessionId(id);
    saveActiveSessionId(id);
    return id;
  }, []);

  const switchSession = useCallback((sessionId: string): Session | null => {
    setActiveSessionId(sessionId);
    saveActiveSessionId(sessionId);
    const all = loadSessions();
    return all.find((s) => s.id === sessionId) || null;
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
      saveSessions(updated);
      return updated;
    });
  }, []);

  return {
    sessions,
    activeSessionId,
    updateSessionInStore,
    newSession,
    switchSession,
    deleteSession,
  };
}
