'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useChatReducer } from '@/hooks/useChatReducer';
import { useChatStream } from '@/hooks/useChatStream';
import { useSessionStore } from '@/hooks/useSessionStore';

export function useChatController() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    loadSessions,
    updateSessionInStore,
    newSession,
    switchSession,
    deleteSession,
  } = useSessionStore();

  // Keep a ref so callbacks don't depend on activeSessionId directly
  const activeSessionIdRef = useRef(activeSessionId);
  activeSessionIdRef.current = activeSessionId;

  const {
    state,
    addUserMessage,
    createAssistantMessage,
    appendToken,
    addCitation,
    setStreamingDone,
    setError,
    setWarning,
    setStatus,
    clearChat,
    loadSession,
    setSessionId,
  } = useChatReducer(activeSessionId || undefined);

  const { sendMessage, cancelStream } = useChatStream({
    sessionId: state.sessionId,
    addUserMessage,
    createAssistantMessage,
    appendToken,
    addCitation,
    setStreamingDone,
    setError,
    setWarning,
    setStatus,
  });

  // Bootstrap: load sessions from API, then create one if none exist
  const didBootstrap = useRef(false);
  useEffect(() => {
    if (didBootstrap.current) return;
    didBootstrap.current = true;

    (async () => {
      const loaded = await loadSessions();
      if (loaded.length > 0) {
        // Switch to the most recent session
        const latest = loaded[0];
        setActiveSessionId(latest.id);
        setSessionId(latest.id);
        if (latest.messages.length > 0) {
          loadSession(latest.messages, latest.id);
        }
      } else {
        // No sessions — create a new one
        const newId = await newSession();
        setSessionId(newId);
        clearChat(newId);
      }
    })();
  }, [loadSessions, setActiveSessionId, setSessionId, loadSession, newSession, clearChat]);

  // Persist messages to session store — debounced during streaming,
  // flushed immediately on stream end (isStreaming → false).
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (state.messages.length === 0) return;

    if (state.isStreaming) {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = setTimeout(() => {
        updateSessionInStore(state.sessionId, state.messages);
      }, 500);
    } else {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
      updateSessionInStore(state.sessionId, state.messages);
    }

    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [state.messages, state.sessionId, state.isStreaming, updateSessionInStore]);

  // ── handlers ────────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    if (!inputValue.trim() || state.isStreaming) return;
    const query = inputValue.trim();
    setInputValue('');
    sendMessage(query);
  }, [inputValue, state.isStreaming, sendMessage]);

  const handleStop = useCallback(() => {
    cancelStream();
    setStreamingDone();
  }, [cancelStream, setStreamingDone]);

  const handleExampleClick = useCallback(
    (question: string) => {
      setInputValue('');
      sendMessage(question);
    },
    [sendMessage],
  );

  const handleNewChat = useCallback(async () => {
    const newId = await newSession();
    setSessionId(newId);
    clearChat(newId);
    setInputValue('');
    setSidebarOpen(false);
  }, [clearChat, newSession, setSessionId]);

  const handleSwitchSession = useCallback(
    async (sessionId: string) => {
      const session = await switchSession(sessionId);
      if (session && session.messages.length > 0) {
        loadSession(session.messages, sessionId);
      } else {
        setSessionId(sessionId);
        clearChat(sessionId);
      }
      setSidebarOpen(false);
    },
    [switchSession, loadSession, setSessionId, clearChat],
  );

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      const sessionTitle = sessions.find((s) => s.id === sessionId)?.title || 'this conversation';
      // TODO: replace window.confirm with a React modal for accessibility and testability
      if (!window.confirm(`Delete "${sessionTitle}"? This cannot be undone.`)) return;

      await deleteSession(sessionId);
      if (sessionId === activeSessionIdRef.current) {
        const newId = await newSession();
        setSessionId(newId);
        clearChat(newId);
        setInputValue('');
        setSidebarOpen(false);
      }
    },
    [sessions, deleteSession, newSession, setSessionId, clearChat],
  );

  return {
    // sidebar
    sidebarOpen,
    setSidebarOpen,
    sessions,
    activeSessionId,
    // chat
    messages: state.messages,
    statusMessage: state.statusMessage,
    isStreaming: state.isStreaming,
    inputValue,
    setInputValue,
    // actions
    handleSend,
    handleStop,
    handleExampleClick,
    handleNewChat,
    handleSwitchSession,
    handleDeleteSession,
  };
}
