'use client';

import React, { useEffect, useRef } from 'react';
import MessageList from './MessageList';
import AutoExpandTextarea from './AutoExpandTextarea';
import SendButton from './SendButton';
import ImagePreview from './ImagePreview';
import { IconChevronDown, IconImage } from './Icons';
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
  selectedImage: File | null;
  imagePreviewUrl: string | null;
  onFileSelect: (file: File) => void;
  onRemoveImage: () => void;
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
  selectedImage,
  imagePreviewUrl,
  onFileSelect,
  onRemoveImage,
}: ChatContainerProps) {
  const {
    scrollRef, userScrolledUp, setUserScrolledUp,
    scrollToBottom, handleScroll,
  } = useScrollManager();

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userScrolledUp) {
      scrollToBottom();
    }
  }, [messages, statusMessage, scrollToBottom, userScrolledUp]);

  const isEmpty = messages.length === 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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
          >
            <IconChevronDown size={12} />
            Scroll to bottom
          </button>
        )}
      </div>

      <div className="sticky bottom-0 px-4 py-3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)', backdropFilter: 'blur(12px)' }}>
        {/* Image preview bar */}
        {imagePreviewUrl && (
          <div className="mx-auto mb-2 flex max-w-3xl items-center gap-2 rounded-xl px-4 py-2"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(124,58,237,0.08))',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <ImagePreview
              src={imagePreviewUrl}
              alt={selectedImage?.name || 'Preview'}
              onRemove={onRemoveImage}
            />
            <span className="truncate text-xs text-white/60">
              {selectedImage?.name}
            </span>
          </div>
        )}

        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl px-4 py-1"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(124,58,237,0.1), rgba(99,102,241,0.08))',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 16px rgba(0,0,0,0.2), 0 0 20px rgba(99,102,241,0.1)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Upload image"
          />

          {/* Attachment button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
                       text-white/50 transition-colors hover:text-white/80
                       disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Attach image"
          >
            <IconImage size={20} />
          </button>

          <AutoExpandTextarea
            value={inputValue}
            onChange={onInputChange}
            onSubmit={onSend}
            disabled={isStreaming}
          />
          <SendButton
            disabled={!inputValue.trim() && !selectedImage}
            isStreaming={isStreaming}
            onSend={onSend}
            onStop={onStop}
          />
        </div>
        <p className="mt-1.5 text-center text-xs text-white/50">
          Press Enter to send · Shift+Enter for new line · 📷 Attach image
        </p>
      </div>
    </div>
  );
}

export default React.memo(ChatContainer);
