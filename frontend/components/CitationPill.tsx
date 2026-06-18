'use client';

import React from 'react';
import type { Citation } from '@/lib/types';
import { classNames } from '@/lib/utils';

interface CitationPillProps {
  citation: Citation;
}

export default function CitationPill({ citation }: CitationPillProps) {
  const isWikipedia = citation.source === 'wikipedia';

  // Build a human-readable label
  let meta = '';
  if (citation.authors) {
    meta += citation.authors;
  }
  if (citation.year) {
    meta += meta ? ` (${citation.year})` : citation.year;
  }
  if (citation.journal) {
    meta += meta ? ` — ${citation.journal}` : citation.journal;
  }

  return (
    <a
      href={citation.url}
      target="_blank"
      rel="noopener noreferrer"
      className={classNames(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium no-underline',
        'transition-all hover:ring-2 hover:ring-offset-1',
        isWikipedia
          ? 'bg-teal-light text-teal-dark hover:ring-teal-primary/30'
          : 'bg-amber-light text-amber-dark hover:ring-amber-dark/30',
      )}
      title={`${citation.title}${meta ? `\n${meta}` : ''}\nClick to open source`}
    >
      <span className="font-bold">[{citation.index}]</span>
      <span aria-hidden="true">{isWikipedia ? '📘' : '💊'}</span>{' '}
      {citation.title.length > 55
        ? citation.title.slice(0, 55) + '…'
        : citation.title}
      <span className="ml-0.5 opacity-60">↗</span>
    </a>
  );
}
