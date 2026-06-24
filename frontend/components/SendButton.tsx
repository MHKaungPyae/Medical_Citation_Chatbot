'use client';

import React from 'react';
import { IconSend, IconStop } from './Icons';

interface SendButtonProps {
  disabled: boolean;
  isStreaming: boolean;
  onSend: () => void;
  onStop: () => void;
}

export default function SendButton({
  disabled,
  isStreaming,
  onSend,
  onStop,
}: SendButtonProps) {
  if (isStreaming) {
    return (
      <button
        onClick={onStop}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full
                   text-white transition-all hover:brightness-110"
        style={{
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 8px rgba(239,68,68,0.3)',
        }}
        aria-label="Stop generating"
        title="Stop generating"
      >
        <IconStop size={12} />
      </button>
    );
  }

  return (
    <button
      onClick={onSend}
      disabled={disabled}
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full
                 text-white transition-all hover:brightness-110 hover:scale-105
                 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 disabled:hover:brightness-100"
      style={{
        background: disabled
          ? 'linear-gradient(135deg, rgba(99,102,241,0.4), rgba(99,102,241,0.3))'
          : 'linear-gradient(135deg, #6366f1, #4f46e5)',
        boxShadow: disabled
          ? 'none'
          : 'inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 8px rgba(99,102,241,0.3), 0 0 12px rgba(99,102,241,0.15)',
        backdropFilter: 'blur(8px)',
      }}
      aria-label="Send message"
      title="Send message"
    >
      <IconSend size={14} />
    </button>
  );
}
