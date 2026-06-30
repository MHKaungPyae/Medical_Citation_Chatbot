'use client';

import { useCallback, useRef } from 'react';
import type { Citation } from '@/lib/types';
import { API_URL, STATUS_MESSAGES, ERROR_MESSAGES } from '@/lib/constants';
import { authenticatedFetch } from '@/lib/api';

interface UseChatStreamOptions {
  sessionId: string;
  addUserMessage: (text: string) => void;
  createAssistantMessage: () => void;
  appendToken: (text: string) => void;
  addCitation: (citation: Citation) => void;
  setStreamingDone: (fullText?: string, citations?: Citation[]) => void;
  setError: (message: string) => void;
  setWarning: (message: string) => void;
  setStatus: (status: string) => void;
}

export function useChatStream({
  sessionId,
  addUserMessage,
  createAssistantMessage,
  appendToken,
  addCitation,
  setStreamingDone,
  setError,
  setWarning,
  setStatus,
}: UseChatStreamOptions) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const isStreamingRef = useRef(false);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isStreamingRef.current = false;
  }, []);

  const sendMessage = useCallback(
    async (query: string) => {
      if (isStreamingRef.current) {
        cancelStream();
      }

      const trimmed = query.trim();
      if (!trimmed) return;

      // Optimistic user message
      addUserMessage(trimmed);

      // Create empty assistant bubble
      createAssistantMessage();

      // Show searching status
      setStatus(STATUS_MESSAGES.SEARCHING);

      const controller = new AbortController();
      abortControllerRef.current = controller;
      isStreamingRef.current = true;

      try {
        const response = await authenticatedFetch(`${API_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: trimmed, session_id: sessionId }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          let errorMessage = ERROR_MESSAGES.SERVER_DOWN;
          try {
            const parsed = JSON.parse(errorText);
            if (parsed.detail) errorMessage = parsed.detail;
          } catch {}
          setError(errorMessage);
          isStreamingRef.current = false;
          return;
        }

        if (!response.body) {
          setError(ERROR_MESSAGES.UNKNOWN);
          isStreamingRef.current = false;
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = '';
        let dataLines: string[] = [];

        const dispatchEvent = () => {
          if (dataLines.length === 0) return;
          const payload = dataLines.join('\n');
          dataLines = [];
          try {
            const data = JSON.parse(payload);
            handleSSEEvent(currentEvent, data);
          } catch {
            // Skip malformed JSON
          }
          currentEvent = '';
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          // Split on LF, strip trailing CR for CRLF line endings
          const lines = buffer.split('\n').map((l) => l.replace(/\r$/, ''));
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              // Dispatch any pending event before starting a new one
              dispatchEvent();
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              dataLines.push(line.slice(6));
            } else if (line.trim() === '') {
              // Blank line = event boundary
              dispatchEvent();
            }
            // Ignore comments (lines starting with :) and unknown fields
          }
        }

        // Flush any remaining event data after stream ends
        dispatchEvent();
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          // User cancelled — keep partial text, mark as done
          setStreamingDone();
        } else {
          setError(ERROR_MESSAGES.SERVER_DOWN);
        }
      } finally {
        isStreamingRef.current = false;
        abortControllerRef.current = null;
      }

      function handleSSEEvent(event: string, data: Record<string, unknown>) {
        switch (event) {
          case 'token':
            if (typeof data.text === 'string') {
              appendToken(data.text);
            }
            break;
          case 'citation':
            if (
              typeof data.index === 'number' &&
              typeof data.url === 'string' &&
              typeof data.title === 'string' &&
              typeof data.source === 'string'
            ) {
              const source = data.source as string;
              const validSource: Citation['source'] =
                source === 'wikipedia' || source === 'fda'
                  ? source
                  : (console.warn(`[useChatStream] Unknown citation source "${source}", defaulting to "wikipedia"`),
                    'wikipedia');
              addCitation({
                index: data.index,
                url: data.url,
                title: data.title,
                source: validSource,
                ...(typeof data.authors === 'string' ? { authors: data.authors } : {}),
                ...(typeof data.year === 'string' || typeof data.year === 'number'
                  ? { year: data.year } : {}),
                ...(typeof data.journal === 'string' ? { journal: data.journal } : {}),
              });
            }
            break;
          case 'done':
            setStreamingDone(
              typeof data.full_text === 'string' ? data.full_text : undefined,
              Array.isArray(data.citations) ? (data.citations as Citation[]) : undefined
            );
            break;
          case 'error':
            setError(
              typeof data.message === 'string'
                ? data.message
                : ERROR_MESSAGES.UNKNOWN
            );
            break;
          case 'warning':
            setWarning(
              typeof data.message === 'string'
                ? data.message
                : 'No live data found.'
            );
            break;
          case 'info':
            // Info events (e.g., "Looked up information on: paracetamol")
            // Could be displayed as status, but we'll just log for now
            console.info('[useChatStream]', data.message);
            break;
          case 'disclaimer':
            // Medical disclaimer - already included in the response text
            break;
        }
      }
    },
    [
      sessionId,
      addUserMessage,
      createAssistantMessage,
      appendToken,
      addCitation,
      setStreamingDone,
      setError,
      setWarning,
      setStatus,
      cancelStream,
    ]
  );

  return {
    sendMessage,
    cancelStream,
  };
}
