'use client';

import { useCallback, useRef } from 'react';
import type { Citation } from '@/lib/types';
import { API_URL, STATUS_MESSAGES, ERROR_MESSAGES } from '@/lib/constants';

interface UseChatStreamOptions {
  sessionId: string;
  addUserMessage: (text: string) => void;
  createAssistantMessage: () => void;
  appendToken: (text: string) => void;
  addCitation: (citation: Citation) => void;
  setStreamingDone: () => void;
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
        const response = await fetch(`${API_URL}/api/chat`, {
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

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              try {
                const data = JSON.parse(dataStr);
                handleSSEEvent(currentEvent, data);
              } catch {
                // Skip malformed JSON lines
              }
            }
          }
        }
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
              addCitation({
                index: data.index,
                url: data.url,
                title: data.title,
                source: data.source as 'pubmed' | 'fda',
              });
            }
            break;
          case 'done':
            setStreamingDone();
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
    isStreaming: isStreamingRef,
  };
}
