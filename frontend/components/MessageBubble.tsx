'use client';

import React from 'react';
import type { Message } from '@/lib/types';
import CitationPill from './CitationPill';
import { renderTextWithCitations } from './InlineCitation';
import StreamingDots from './StreamingDots';

interface MessageBubbleProps {
  message: Message;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="mb-3 flex animate-fade-in justify-end">
        <div className="max-w-[80%] space-y-2">
          {message.content && (
            <div className="rounded-2xl rounded-br-md bg-teal-primary px-4 py-3 text-sm leading-relaxed text-white shadow-sm">
              {message.content}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Always parse [[CITATION:N]] markers into clickable inline links.
  // During streaming, citations from the 'citation' SSE events are used.
  // When done, the backend-filtered citations (only actually used ones) replace them.
  const renderedContent =
    message.content && message.citations.length > 0
      ? renderTextWithCitations(message.content, message.citations)
      : message.content;

  return (
    <div className="mb-3 flex animate-fade-in items-start">
      <div className="max-w-[85%]">
        <div className="rounded-2xl rounded-bl-md border border-white/15 bg-black/25 backdrop-blur-sm px-4 py-3 shadow-sm">
          <p className="text-sm leading-relaxed text-white/90 whitespace-pre-wrap">
            {renderedContent}
            {message.status === 'streaming' && !message.content && (
              <span className="text-white/50 italic">Thinking...</span>
            )}
          </p>

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
