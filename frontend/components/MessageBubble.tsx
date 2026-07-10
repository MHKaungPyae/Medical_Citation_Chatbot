'use client';

import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message, Citation } from '@/lib/types';
import CitationPill from './CitationPill';
import StreamingDots from './StreamingDots';

interface MessageBubbleProps {
  message: Message;
}

// ── Citation badge component ──────────────────────────────────────────────

function CitationBadge({ citation }: { citation: Citation }) {
  const isWikipedia = citation.source === 'wikipedia';
  const label = isWikipedia ? 'Wikipedia' : 'FDA';
  const colorClasses = isWikipedia
    ? 'bg-teal-light text-teal-dark hover:bg-teal-primary hover:text-white'
    : 'bg-amber-light text-amber-dark hover:bg-amber-primary/80 hover:text-white';

  if (!citation.url) return null;

  return (
    <a
      href={citation.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-0.5 no-underline mx-0.5 rounded-full px-1.5 py-px text-[11px] font-medium transition-all hover:ring-2 hover:ring-offset-1 ${colorClasses}`}
      title={citation.title}
    >
      {label} ↗
    </a>
  );
}

// ── Render markdown content with inline citation badges ───────────────────

function renderMarkdownWithCitations(
  content: string,
  citations: Citation[],
): React.ReactNode[] {
  const citeMap = new Map<number, Citation>();
  for (const c of citations) {
    citeMap.set(c.index, c);
  }

  const markerPattern = /\[\[CITATION:(\d+)\]\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = markerPattern.exec(content)) !== null) {
    // Text before this marker → render as markdown
    if (match.index > lastIndex) {
      const segment = content.slice(lastIndex, match.index);
      parts.push(
        <Markdown key={`md-${lastIndex}`} remarkPlugins={[remarkGfm]}>
          {segment}
        </Markdown>,
      );
    }

    // Citation badge
    const citeIndex = parseInt(match[1], 10);
    const citation = citeMap.get(citeIndex);
    if (citation) {
      parts.push(
        <CitationBadge key={`c-${match.index}`} citation={citation} />,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after the last marker
  if (lastIndex < content.length) {
    const segment = content.slice(lastIndex);
    parts.push(
      <Markdown key={`md-${lastIndex}`} remarkPlugins={[remarkGfm]}>
        {segment}
      </Markdown>,
    );
  }

  return parts;
}

// ── Markdown prose styles ─────────────────────────────────────────────────

const proseClasses = `
  chat-bubble-content
  text-sm leading-relaxed text-white/90
  prose prose-invert prose-sm max-w-none
  prose-p:my-2 prose-p:leading-relaxed
  prose-headings:text-white prose-headings:font-semibold
  prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2
  prose-h3:text-sm prose-h3:mt-3 prose-h3:mb-1.5
  prose-strong:text-white prose-strong:font-semibold
  prose-ul:my-2 prose-ul:list-disc prose-ul:pl-5
  prose-ol:my-2 prose-ol:list-decimal prose-ol:pl-5
  prose-li:my-0.5 prose-li:leading-relaxed
  prose-blockquote:border-l-teal-primary/50 prose-blockquote:bg-white/5 prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-blockquote:pr-3 prose-blockquote:pl-3 prose-blockquote:my-3
  prose-blockquote:text-white/80 prose-blockquote:not-italic
  prose-code:text-teal-light prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
  prose-a:text-teal-light prose-a:no-underline hover:prose-a:underline
  prose-table:text-xs prose-table:border-white/10
  prose-th:text-white/70 prose-th:font-medium prose-th:p-2 prose-th:border-b prose-th:border-white/10
  prose-td:p-2 prose-td:border-b prose-td:border-white/5
  prose-hr:border-white/10 prose-hr:my-4
`.replace(/\n\s+/g, ' ').trim();

// ── MessageBubble ─────────────────────────────────────────────────────────

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="mb-3 flex animate-fade-in justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-teal-primary px-4 py-3 text-sm leading-relaxed text-white shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  // Render markdown with inline citation badges
  const renderedContent =
    message.content && message.citations.length > 0
      ? renderMarkdownWithCitations(message.content, message.citations)
      : message.content;

  return (
    <div className="mb-3 flex animate-fade-in items-start">
      <div className="max-w-[85%]">
        <div className="rounded-2xl rounded-bl-md border border-white/15 bg-black/25 backdrop-blur-sm px-4 py-3 shadow-sm">
          <div className={proseClasses}>
            {renderedContent}
            {message.status === 'streaming' && !message.content && (
              <span className="text-white/50 italic">Thinking...</span>
            )}
          </div>

          {/* Streaming indicator */}
          {message.status === 'streaming' && message.content && (
            <StreamingDots />
          )}

          {/* Citation pills shown only when done and citations exist */}
          {message.status === 'done' && message.citations.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-2.5">
              {message.citations.map((c) => (
                <CitationPill key={c.index} citation={c} />
              ))}
            </div>
          )}
        </div>

        {/* Error banner */}
        {message.status === 'error' && message.errorMessage && (
          <div className="mt-2 rounded-xl border border-red-200 bg-error-bg px-3 py-2 text-xs text-error-red">
            {message.errorMessage}
          </div>
        )}

        {/* Warning banner */}
        {message.warningMessage && (
          <div className="mt-2 rounded-xl border border-amber-200 bg-warning-bg px-3 py-2 text-xs text-amber-dark">
            {message.warningMessage}
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(MessageBubble);
