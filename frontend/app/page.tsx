'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar';
import ChatContainer from '@/components/ChatContainer';
import { useChatController } from '@/hooks/useChatController';

export default function Home() {
  const {
    sidebarOpen, setSidebarOpen,
    sessions, activeSessionId,
    messages, statusMessage, isStreaming,
    inputValue, setInputValue,
    handleSend, handleStop, handleExampleClick,
    handleNewChat, handleSwitchSession, handleDeleteSession,
  } = useChatController();

  return (
    <div className="flex h-full bg-cream-bg">

      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onNewChat={handleNewChat}
        onSwitchSession={handleSwitchSession}
        onDeleteSession={handleDeleteSession}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-warm-border bg-white px-4 py-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-1.5 text-muted-warm transition-colors hover:bg-cream-bg hover:text-warm-gray md:hidden"
            aria-label="Toggle sidebar"
            aria-expanded={sidebarOpen}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-teal-primary" />
            <h1 className="text-sm font-semibold text-warm-gray">Medical Assistant</h1>
          </div>

          <button
            onClick={handleNewChat}
            className="ml-auto hidden rounded-lg px-3 py-1.5 text-xs font-medium text-teal-dark
                       transition-all hover:bg-teal-light md:block"
          >
            + New Chat
          </button>
        </header>

        <ChatContainer
          messages={messages}
          statusMessage={statusMessage}
          isStreaming={isStreaming}
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
