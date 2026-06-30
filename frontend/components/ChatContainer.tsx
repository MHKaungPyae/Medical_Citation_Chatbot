'use client';

import React, { useEffect } from 'react';
import MessageList from './MessageList';
import AutoExpandTextarea from './AutoExpandTextarea';
import SendButton from './SendButton';
import { IconChevronDown } from './Icons';
import { useScrollManager } from '@/hooks/useScrollManager';
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

function ChatContainer({
  messages,
  statusMessage,
  isStreaming,
  inputValue,
  onInputChange,
  onSend,
  onStop,
  onExampleClick,
}: ChatContainerProps) {
  const {
    scrollRef, userScrolledUp, setUserScrolledUp,
    scrollToBottom, handleScroll,
  } = useScrollManager();

  useEffect(() => {
    if (!userScrolledUp) {
      scrollToBottom();
    }
  }, [messages, statusMessage, scrollToBottom, userScrolledUp]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
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

        {userScrolledUp && (
          <button
            onClick={() => { scrollToBottom(); setUserScrolledUp(false); }}
            className="sticky bottom-4 mx-auto flex items-center gap-1.5 rounded-full
                       border border-white/20 bg-black/30 backdrop-blur-sm px-4 py-2 text-xs text-white/70
                       shadow-md transition-all hover:text-white"
            aria-label="Scroll to bottom"
          >
            <IconChevronDown size={12} />
            Scroll to bottom
          </button>
        )}
      </div>

      <div className="sticky bottom-0 px-4 py-3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)', backdropFilter: 'blur(12px)' }}>
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl px-4 py-1"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(124,58,237,0.1), rgba(99,102,241,0.08))',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 16px rgba(0,0,0,0.2), 0 0 20px rgba(99,102,241,0.1)',
            backdropFilter: 'blur(16px)',
          }}
        >
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
        <p className="mt-1.5 text-center text-xs text-white/50">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

export default React.memo(ChatContainer);
