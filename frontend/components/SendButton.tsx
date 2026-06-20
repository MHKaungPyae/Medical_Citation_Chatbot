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
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md
                   bg-red-500 text-white transition-all hover:bg-red-600"
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
                 bg-teal-primary text-white transition-all
                 hover:bg-teal-dark hover:shadow-md
                 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-teal-primary disabled:hover:shadow-none"
      aria-label="Send message"
      title="Send message"
    >
      <IconSend size={14} />
    </button>
  );
}
