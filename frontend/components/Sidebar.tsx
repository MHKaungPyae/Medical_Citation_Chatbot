'use client';

import React from 'react';
import type { Session } from '@/lib/types';
import { formatTimestamp } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  sessions: Session[];
  activeSessionId: string;
  onNewChat: () => void;
  onSwitchSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}

export default function Sidebar({
  isOpen,
  onToggle,
  sessions,
  activeSessionId,
  onNewChat,
  onSwitchSession,
  onDeleteSession,
}: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/20 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed left-0 top-0 z-30 flex h-full w-64 flex-col border-r border-warm-border bg-white
                    transition-transform duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                    md:static md:z-0 md:translate-x-0`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-warm-border px-4 py-3">
          <span className="text-sm font-semibold text-warm-gray">Conversations</span>
          <button
            onClick={onToggle}
            className="rounded-lg p-1 text-muted-warm hover:bg-cream-bg hover:text-warm-gray md:hidden"
            aria-label="Close sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* New Chat button */}
        <div className="px-3 py-3">
          <button
            onClick={onNewChat}
            className="w-full rounded-xl bg-teal-primary px-4 py-2.5 text-sm font-medium text-white
                       transition-all hover:bg-teal-dark hover:shadow-md"
          >
            + New Chat
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-2">
          {sessions.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-muted-warm">
              No past conversations
            </p>
          ) : (
            <div className="space-y-1">
              {[...sessions]
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((session) => (
                  <button
                    key={session.id}
                    onClick={() => onSwitchSession(session.id)}
                    className={`group flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5
                               text-sm transition-colors text-left
                               ${
                                 session.id === activeSessionId
                                   ? 'bg-teal-light text-teal-dark'
                                   : 'text-warm-gray hover:bg-cream-bg'
                               }`}
                    aria-label={`${session.title} — ${formatTimestamp(session.updatedAt)}`}
                    aria-current={session.id === activeSessionId ? 'true' : undefined}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{session.title}</p>
                      <p className="text-xs text-muted-warm">
                        {formatTimestamp(session.updatedAt)}
                      </p>
                    </div>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="ml-2 flex-shrink-0 rounded p-1 text-muted-warm opacity-0
                                 transition-all hover:bg-warm-border/30 hover:text-error-red
                                 group-hover:opacity-100"
                      aria-label={`Delete conversation: ${session.title}`}
                      title="Delete conversation"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
