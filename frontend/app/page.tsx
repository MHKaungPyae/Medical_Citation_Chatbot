'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ChatContainer from '@/components/ChatContainer';
import ConfirmDialog from '@/components/ConfirmDialog';
import ErrorBoundary from '@/components/ErrorBoundary';
import { IconMenu } from '@/components/Icons';
import { useChatController } from '@/hooks/useChatController';
import { useAuthContext } from '@/components/AuthProvider';

export default function Home() {
  const router = useRouter();
  const { user, loading, signOut } = useAuthContext();

  const {
    sidebarOpen, setSidebarOpen,
    sessions, activeSessionId,
    messages, statusMessage, isStreaming,
    inputValue, setInputValue,
    handleSend, handleStop, handleExampleClick,
    handleNewChat, handleSwitchSession, handleDeleteSession,
    pendingDelete, confirmDelete, cancelDelete,
  } = useChatController();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  // Show nothing while checking auth
  if (loading || !user) {
    return null;
  }

  return (
    <div className="flex h-full">

      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onNewChat={handleNewChat}
        onSwitchSession={handleSwitchSession}
        onDeleteSession={handleDeleteSession}
        user={user}
        onSignOut={signOut}
      />

      <ErrorBoundary>
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white md:hidden"
              aria-label="Toggle sidebar"
              aria-expanded={sidebarOpen}
            >
              <IconMenu size={20} />
            </button>

            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-teal-primary" />
              <h1 className="text-sm font-semibold text-white">Medical Assistant</h1>
            </div>

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
      </ErrorBoundary>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete conversation?"
        message={`"${pendingDelete?.title}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}
