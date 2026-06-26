'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useChatReducer } from '@/hooks/useChatReducer';
import { useChatStream } from '@/hooks/useChatStream';
import { useSessionStore } from '@/hooks/useSessionStore';
import { API_URL, STATUS_MESSAGES, ERROR_MESSAGES } from '@/lib/constants';
import { authenticatedFetch } from '@/lib/api';
import type { Citation } from '@/lib/types';

export function useChatController() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    loadSessions,
    updateSessionInStore,
    newSession,
    switchSession,
    deleteSession,
  } = useSessionStore();

  // Keep a ref so callbacks don't depend on activeSessionId directly
  const activeSessionIdRef = useRef(activeSessionId);
  activeSessionIdRef.current = activeSessionId;

  const {
    state,
    addUserMessage,
    createAssistantMessage,
    appendToken,
    addCitation,
    setStreamingDone,
    setError,
    setWarning,
    setStatus,
    clearChat,
    loadSession,
    setSessionId,
    updateMessageImage,
  } = useChatReducer(activeSessionId || undefined);

  // Keep a ref to current messages for use in async callbacks
  const messagesRef = useRef(state.messages);
  messagesRef.current = state.messages;

  const { sendMessage, cancelStream } = useChatStream({
    sessionId: state.sessionId,
    addUserMessage,
    createAssistantMessage,
    appendToken,
    addCitation,
    setStreamingDone,
    setError,
    setWarning,
    setStatus,
  });

  // ── image handling ────────────────────────────────────────────────────

  const handleFileSelect = useCallback((file: File) => {
    setSelectedImage(file);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
  }, []);

  const handleRemoveImage = useCallback(() => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImage(null);
    setImagePreviewUrl(null);
  }, [imagePreviewUrl]);

  const clearImage = useCallback(() => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImage(null);
    setImagePreviewUrl(null);
  }, [imagePreviewUrl]);

  const sendImage = useCallback(
    async (query: string, image: File, blobUrl: string | null) => {
      addUserMessage(query || 'What is in this image?', blobUrl || undefined);
      createAssistantMessage();
      setStatus(STATUS_MESSAGES.SEARCHING);

      try {
        const formData = new FormData();
        formData.append('image', image);
        formData.append('query', query);
        formData.append('session_id', state.sessionId);

        const response = await authenticatedFetch(`${API_URL}/api/chat/image`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          let errorMessage = ERROR_MESSAGES.SERVER_DOWN;
          try {
            const parsed = JSON.parse(errorText);
            if (parsed.detail) errorMessage = parsed.detail;
          } catch {}
          setError(errorMessage);
          return;
        }

        if (!response.body) {
          setError(ERROR_MESSAGES.UNKNOWN);
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
          } catch {}
          currentEvent = '';
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n').map((l) => l.replace(/\r$/, ''));
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              dispatchEvent();
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              dataLines.push(line.slice(6));
            } else if (line.trim() === '') {
              dispatchEvent();
            }
          }
        }

        dispatchEvent();
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          setStreamingDone();
        } else {
          setError(ERROR_MESSAGES.SERVER_DOWN);
        }
      }

      function handleSSEEvent(event: string, data: Record<string, unknown>) {
        switch (event) {
          case 'token':
            if (typeof data.text === 'string') appendToken(data.text);
            break;
          case 'citation':
            if (
              typeof data.index === 'number' &&
              typeof data.url === 'string' &&
              typeof data.title === 'string' &&
              typeof data.source === 'string'
            ) {
              const source = data.source as string;
              const validSource =
                source === 'wikipedia' || source === 'fda' ? source : 'wikipedia';
              addCitation({
                index: data.index,
                url: data.url,
                title: data.title,
                source: validSource as 'wikipedia' | 'fda',
                ...(typeof data.authors === 'string' ? { authors: data.authors } : {}),
                ...(typeof data.year === 'string' || typeof data.year === 'number'
                  ? { year: data.year } : {}),
                ...(typeof data.journal === 'string' ? { journal: data.journal } : {}),
              });
            }
            break;
          case 'done':
            // Update user message with real Supabase Storage URL
            if (typeof data.image_url === 'string') {
              const lastUserMsg = [...messagesRef.current].reverse().find(m => m.role === 'user');
              if (lastUserMsg) {
                updateMessageImage(lastUserMsg.id, data.image_url);
              }
            }
            setStreamingDone(
              typeof data.full_text === 'string' ? data.full_text : undefined,
              Array.isArray(data.citations) ? (data.citations as Citation[]) : undefined
            );
            break;
          case 'error':
            setError(typeof data.message === 'string' ? data.message : ERROR_MESSAGES.UNKNOWN);
            break;
          case 'warning':
            setWarning(typeof data.message === 'string' ? data.message : 'No live data found.');
            break;
        }
      }
    },
    [
      state.sessionId,
      state.messages,
      addUserMessage,
      createAssistantMessage,
      appendToken,
      addCitation,
      setStreamingDone,
      setError,
      setWarning,
      setStatus,
      updateMessageImage,
    ]
  );

  // Bootstrap: load sessions from API, then create one if none exist
  const didBootstrap = useRef(false);
  useEffect(() => {
    if (didBootstrap.current) return;
    didBootstrap.current = true;

    (async () => {
      const loaded = await loadSessions();
      if (loaded.length > 0) {
        // Switch to the most recent session
        const latest = loaded[0];
        setActiveSessionId(latest.id);
        setSessionId(latest.id);
        if (latest.messages.length > 0) {
          loadSession(latest.messages, latest.id);
        }
      } else {
        // No sessions — create a new one
        const newId = await newSession();
        setSessionId(newId);
        clearChat(newId);
      }
    })();
  }, [loadSessions, setActiveSessionId, setSessionId, loadSession, newSession, clearChat]);

  // Persist messages to session store — debounced during streaming,
  // flushed immediately on stream end (isStreaming → false).
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (state.messages.length === 0) return;

    if (state.isStreaming) {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = setTimeout(() => {
        updateSessionInStore(state.sessionId, state.messages);
      }, 500);
    } else {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
      updateSessionInStore(state.sessionId, state.messages);
    }

    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [state.messages, state.sessionId, state.isStreaming, updateSessionInStore]);

  // ── handlers ────────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    if (state.isStreaming) return;

    if (selectedImage) {
      const query = inputValue.trim();
      const blobUrl = imagePreviewUrl;
      setInputValue('');
      setSelectedImage(null);
      setImagePreviewUrl(null);
      // Pass blobUrl to sendImage — it will revoke after updating message with real URL
      sendImage(query, selectedImage, blobUrl);
      return;
    }

    if (!inputValue.trim()) return;
    const query = inputValue.trim();
    setInputValue('');
    sendMessage(query);
  }, [inputValue, state.isStreaming, selectedImage, imagePreviewUrl, sendMessage, sendImage]);

  const handleStop = useCallback(() => {
    cancelStream();
    setStreamingDone();
  }, [cancelStream, setStreamingDone]);

  const handleExampleClick = useCallback(
    (question: string) => {
      setInputValue('');
      clearImage();
      sendMessage(question);
    },
    [sendMessage, clearImage],
  );

  const handleNewChat = useCallback(async () => {
    const newId = await newSession();
    setSessionId(newId);
    clearChat(newId);
    setInputValue('');
    clearImage();
    setSidebarOpen(false);
  }, [clearChat, newSession, setSessionId, clearImage]);

  const handleSwitchSession = useCallback(
    async (sessionId: string) => {
      const session = await switchSession(sessionId);
      if (session && session.messages.length > 0) {
        loadSession(session.messages, sessionId);
      } else {
        setSessionId(sessionId);
        clearChat(sessionId);
      }
      clearImage();
      setSidebarOpen(false);
    },
    [switchSession, loadSession, setSessionId, clearChat, clearImage],
  );

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      const sessionTitle = sessions.find((s) => s.id === sessionId)?.title || 'this conversation';
      if (!window.confirm(`Delete "${sessionTitle}"? This cannot be undone.`)) return;

      await deleteSession(sessionId);
      if (sessionId === activeSessionIdRef.current) {
        const newId = await newSession();
        setSessionId(newId);
        clearChat(newId);
        setInputValue('');
        setSidebarOpen(false);
      }
    },
    [sessions, deleteSession, newSession, setSessionId, clearChat],
  );

  return {
    // sidebar
    sidebarOpen,
    setSidebarOpen,
    sessions,
    activeSessionId,
    // chat
    messages: state.messages,
    statusMessage: state.statusMessage,
    isStreaming: state.isStreaming,
    inputValue,
    setInputValue,
    // image
    selectedImage,
    imagePreviewUrl,
    handleFileSelect,
    handleRemoveImage,
    // actions
    handleSend,
    handleStop,
    handleExampleClick,
    handleNewChat,
    handleSwitchSession,
    handleDeleteSession,
  };
}
