'use client';

import React, { useRef, useEffect, useCallback } from 'react';

interface AutoExpandTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

export default function AutoExpandTextarea({
  value,
  onChange,
  onSubmit,
  disabled,
}: AutoExpandTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSubmit();
      }
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="Ask a medical question..."
      disabled={disabled}
      rows={1}
      className="flex-1 resize-none border-0 bg-transparent py-2 text-sm
                 text-warm-gray placeholder-muted-warm outline-none
                 disabled:cursor-not-allowed disabled:opacity-50"
      style={{ scrollbarWidth: 'thin' }}
    />
  );
}
