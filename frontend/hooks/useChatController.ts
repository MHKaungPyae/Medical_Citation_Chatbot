'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useChatReducer } from '@/hooks/useChatReducer';
import { useChatStream } from '@/hooks/useChatStream';
import { useSessionStore } from '@/hooks/useSessionStore';

export function useChatController() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const {
    sessions,
    activeSessionId,
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

  // Bootstrap: create session on first mount only if localStorage had none
  const didBootstrap = useRef(false);
  useEffect(() => {
    if (!didBootstrap.current && !activeSessionId) {
      didBootstrap.current = true;
      newSession();
    }
    didBootstrap.current = true;
  }, [activeSessionId, newSession]);

  // Persist messages to session store — debounced during streaming,
  // flushed immediately on stream end (isStreaming → false).
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (state.messages.length === 0) return;

    if (state.isStreaming) {
      // During streaming: debounce to avoid writing localStorage on every token
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = setTimeout(() => {
        updateSessionInStore(state.sessionId, state.messages);
      }, 500);
    } else {
      // Stream done or error — flush immediately
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

  const handleNewChat = useCallback(() => {
    const newId = newSession();
    setSessionId(newId);
    clearChat(newId);
    setInputValue('');
    setSidebarOpen(false);
  }, [clearChat, newSession, setSessionId]);

  const handleSwitchSession = useCallback(
    (sessionId: string) => {
      const session = switchSession(sessionId);
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
    (sessionId: string) => {
      const sessionTitle = sessions.find((s) => s.id === sessionId)?.title || 'this conversation';
      if (!window.confirm(`Delete "${sessionTitle}"? This cannot be undone.`)) return;

      deleteSession(sessionId);
      if (sessionId === activeSessionIdRef.current) {
        const newId = newSession();
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
