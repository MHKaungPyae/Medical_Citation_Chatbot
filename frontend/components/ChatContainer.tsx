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
                       border border-warm-border bg-white px-4 py-2 text-xs text-muted-warm
                       shadow-md transition-all hover:text-warm-gray"
          >
            <IconChevronDown size={12} />
            Scroll to bottom
          </button>
        )}
      </div>

      <div className="sticky bottom-0 bg-white/80 backdrop-blur-sm px-4 py-3">
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

export default React.memo(ChatContainer);
