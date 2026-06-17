'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import MessageList from './MessageList';
import AutoExpandTextarea from './AutoExpandTextarea';
import SendButton from './SendButton';
import type { Message } from '@/lib/types';

interface ChatContainerProps {
  messages: Message[];
  statusMessage: string | null;
  isStreaming: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onExampleClick: (question: string) => void;
}

export default function ChatContainer({
  messages,
  statusMessage,
  isStreaming,
  inputValue,
  onInputChange,
  onSend,
  onStop,
  onExampleClick,
}: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Auto-scroll when messages change or tokens stream in
  useEffect(() => {
    if (!userScrolledUp) {
      scrollToBottom();
    }
  }, [messages, statusMessage, scrollToBottom, userScrolledUp]);

  // Scroll detection: has the user manually scrolled up?
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 60;
    setUserScrolledUp(!isNearBottom);
  }, []);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={`chat-scroll flex-1 overflow-y-auto ${isEmpty ? 'flex' : ''}`}
      >
        <MessageList
          messages={messages}
          statusMessage={statusMessage}
          onExampleClick={onExampleClick}
        />

        {/* Scroll-to-bottom button */}
        {userScrolledUp && (
          <button
            onClick={() => {
              scrollToBottom();
              setUserScrolledUp(false);
            }}
            className="sticky bottom-4 mx-auto flex items-center gap-1.5 rounded-full
                       border border-warm-border bg-white px-4 py-2 text-xs text-muted-warm
                       shadow-md transition-all hover:text-warm-gray"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
            Scroll to bottom
          </button>
        )}
      </div>

      {/* Input area */}
      <div className="sticky bottom-0 border-t border-warm-border bg-white/80 backdrop-blur-sm px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-warm-border bg-white px-4 py-1 shadow-sm">
          <AutoExpandTextarea
            value={inputValue}
            onChange={onInputChange}
            onSubmit={onSend}
            disabled={isStreaming}
          />
          <SendButton
            disabled={!inputValue.trim()}
            isStreaming={isStreaming}
            onSend={onSend}
            onStop={onStop}
          />
        </div>
        <p className="mt-1.5 text-center text-xs text-muted-warm">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
