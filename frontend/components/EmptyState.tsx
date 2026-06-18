'use client';

import React from 'react';
import { EXAMPLE_QUESTIONS } from '@/lib/constants';

interface EmptyStateProps {
  onExampleClick: (question: string) => void;
}

export default function EmptyState({ onExampleClick }: EmptyStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="animate-fade-in text-center max-w-md">
        <div className="mb-4 text-5xl">🩺</div>
        <h2 className="mb-2 text-lg font-semibold text-warm-gray">
          Medical Research Assistant
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-muted-warm">
          I search Wikipedia Medical and FDA databases to give you cited,
          evidence-based medical answers. Every claim comes with a clickable source.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => onExampleClick(q)}
              className="rounded-full bg-teal-light px-4 py-2 text-xs font-medium text-teal-dark
                         transition-all hover:bg-teal-primary hover:text-white hover:shadow-sm"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
