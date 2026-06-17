'use client';

import React from 'react';

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
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <rect x="1" y="1" width="10" height="10" rx="1" />
        </svg>
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
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="19" x2="12" y2="5" />
        <polyline points="5 12 12 5 19 12" />
      </svg>
    </button>
  );
}
