'use client';

import React from 'react';
import type { Citation } from '@/lib/types';
import { classNames } from '@/lib/utils';

interface CitationPillProps {
  citation: Citation;
}

export default function CitationPill({ citation }: CitationPillProps) {
  const isPubMed = citation.source === 'pubmed';

  return (
    <a
      href={citation.url}
      target="_blank"
      rel="noopener noreferrer"
      className={classNames(
        'inline-block rounded-full px-2 py-0.5 text-xs font-medium no-underline',
        'transition-all hover:ring-2 hover:ring-offset-1',
        isPubMed
          ? 'bg-teal-light text-teal-dark hover:ring-teal-primary/30'
          : 'bg-amber-light text-amber-dark hover:ring-amber-dark/30'
      )}
      title={`${citation.title} — Click to open in new tab`}
    >
      [{citation.index}] {isPubMed ? 'PubMed' : 'FDA Label'} ↗
    </a>
  );
}
