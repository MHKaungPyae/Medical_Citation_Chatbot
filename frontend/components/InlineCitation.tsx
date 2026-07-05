'use client';

import React from 'react';
import type { Citation } from '@/lib/types';

/**
 * Render text with [[CITATION:N]] markers transformed into clickable
 * source-labeled links.
 *
 * Example:
 *   "Paracetamol helps reduce fever [[CITATION:1]]."
 *   → "Paracetamol helps reduce fever [Wikipedia ↗]."
 *
 * The [Wikipedia ↗] badge links to citation.url and shows the title on hover.
 * Unrecognized markers (no matching Citation object) are silently stripped.
 */
export function renderTextWithCitations(
  text: string,
  citations: Citation[],
): React.ReactNode[] {
  // Build a lookup dict from index → citation
  const citeMap: Map<number, Citation> = new Map();
  for (const c of citations) {
    citeMap.set(c.index, c);
  }

  // Match [[CITATION:N]], [[CITATION N]], and [[CITATION: N]] variants
  const markerPattern = /\[\[CITATION[:\s]+(\d+)\]\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = markerPattern.exec(text)) !== null) {
    // Text before this marker
    if (match.index > lastIndex) {
      parts.push(
        <span key={`t-${lastIndex}`}>
          {text.slice(lastIndex, match.index)}
        </span>,
      );
    }

    const citeIndex = parseInt(match[1], 10);
    const citation = citeMap.get(citeIndex);

    if (citation && citation.url) {
      const isWikipedia = citation.source === 'wikipedia';
      const label = isWikipedia ? 'Wikipedia' : 'FDA';
      const colorClasses = isWikipedia
        ? 'bg-teal-light text-teal-dark hover:bg-teal-primary hover:text-white'
        : 'bg-amber-light text-amber-dark hover:bg-amber-primary/80 hover:text-white';

      parts.push(
        <a
          key={`c-${match.index}`}
          href={citation.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-0.5 no-underline mx-0.5 rounded-full px-1.5 py-px text-[11px] font-medium transition-all hover:ring-2 hover:ring-offset-1 ${colorClasses}`}
          title={citation.title}
        >
          {label} ↗
        </a>,
      );
    }
    // else: unrecognized marker → silently strip (don't show raw [[CITATION:N]])

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after the last marker
  if (lastIndex < text.length) {
    parts.push(
      <span key={`t-${lastIndex}`}>{text.slice(lastIndex)}</span>,
    );
  }

  return parts;
}
