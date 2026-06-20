'use client';

import React, { useMemo } from 'react';
import type { Session } from '@/lib/types';
import { formatTimestamp } from '@/lib/utils';
import { IconClose, IconTrash } from './Icons';

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
  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions],
  );

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
            <IconClose size={18} />
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
              {sortedSessions.map((session) => (
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
                      <IconTrash size={14} />
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
