'use client';

import React from 'react';

interface StatusBubbleProps {
  message: string;
}

export default function StatusBubble({ message }: StatusBubbleProps) {
  return (
    <div className="mb-3 flex animate-fade-in items-start">
      <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md bg-teal-light px-4 py-2.5 text-sm text-teal-dark">
        <svg
          className="h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="8" />
        </svg>
        <span>{message}</span>
      </div>
    </div>
  );
}
