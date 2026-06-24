'use client';

import React from 'react';
import { IconSpinner } from './Icons';

interface StatusBubbleProps {
  message: string;
}

export default function StatusBubble({ message }: StatusBubbleProps) {
  return (
    <div className="mb-3 flex animate-fade-in items-start">
      <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md bg-teal-primary/20 backdrop-blur-sm px-4 py-2.5 text-sm text-white/80">
        <IconSpinner size={16} />
        <span>{message}</span>
      </div>
    </div>
  );
}
