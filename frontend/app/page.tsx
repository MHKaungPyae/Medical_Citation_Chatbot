'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatContainer from '@/components/ChatContainer';
import { useChatReducer } from '@/hooks/useChatReducer';
import { useChatStream } from '@/hooks/useChatStream';
import { useSessionStore } from '@/hooks/useSessionStore';
import type { Message } from '@/lib/types';
import { EXAMPLE_QUESTIONS } from '@/lib/constants';

export default function Home() {
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

  // Sync session ID with store on mount
  useEffect(() => {
    if (!activeSessionId) {
      const id = newSession();
      // New session created in store, our reducer already has its own
    }
  }, []);

  // Persist messages to session store when they change
  useEffect(() => {
    if (state.messages.length > 0) {
      updateSessionInStore(state.sessionId, state.messages);
    }
  }, [state.messages, state.sessionId, updateSessionInStore]);

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
    [sendMessage]
  );

  const handleNewChat = useCallback(() => {
    clearChat();
    const id = newSession();
    // clearChat already generates a new ID internally, but we sync
    setInputValue('');
    setSidebarOpen(false);
  }, [clearChat, newSession]);

  const handleSwitchSession = useCallback(
    (sessionId: string) => {
      const session = switchSession(sessionId);
      if (session && session.messages.length > 0) {
        loadSession(session.messages);
      }
      setSidebarOpen(false);
    },
    [switchSession, loadSession]
  );

  const handleDeleteSession = useCallback(
    (sessionId: string) => {
      deleteSession(sessionId);
      if (sessionId === activeSessionId) {
        handleNewChat();
      }
    },
    [deleteSession, activeSessionId, handleNewChat]
  );

  return (
    <div className="flex h-full bg-cream-bg">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onNewChat={handleNewChat}
        onSwitchSession={handleSwitchSession}
        onDeleteSession={handleDeleteSession}
      />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-warm-border bg-white px-4 py-3">
          {/* Hamburger */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-1.5 text-muted-warm transition-colors hover:bg-cream-bg hover:text-warm-gray md:hidden"
            aria-label="Toggle sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-teal-primary" />
            <h1 className="text-sm font-semibold text-warm-gray">Medical Assistant</h1>
          </div>

          {/* Desktop New Chat */}
          <button
            onClick={handleNewChat}
            className="ml-auto hidden rounded-lg px-3 py-1.5 text-xs font-medium text-teal-dark
                       transition-all hover:bg-teal-light md:block"
          >
            + New Chat
          </button>
        </header>

        {/* Chat */}
        <ChatContainer
          messages={state.messages}
          statusMessage={state.statusMessage}
          isStreaming={state.isStreaming}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSend={handleSend}
          onStop={handleStop}
          onExampleClick={handleExampleClick}
        />
      </div>
    </div>
  );
}
