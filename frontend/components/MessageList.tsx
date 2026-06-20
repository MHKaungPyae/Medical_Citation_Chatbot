'use client';

import React from 'react';
import type { Message } from '@/lib/types';
import MessageBubble from './MessageBubble';
import StatusBubble from './StatusBubble';
import EmptyState from './EmptyState';

interface MessageListProps {
  messages: Message[];
  statusMessage: string | null;
  onExampleClick: (question: string) => void;
}

function MessageList({
  messages,
  statusMessage,
  onExampleClick,
}: MessageListProps) {
  if (messages.length === 0) {
    return <EmptyState onExampleClick={onExampleClick} />;
  }

  return (
    <div className="flex-1 px-4 py-4" role="log" aria-live="polite" aria-label="Chat messages">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {statusMessage && <StatusBubble message={statusMessage} />}
    </div>
  );
}

export default React.memo(MessageList);
