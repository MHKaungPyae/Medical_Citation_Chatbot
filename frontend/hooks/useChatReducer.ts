import { useReducer, useCallback } from 'react';
import type { ChatState, ChatAction, Message, Citation } from '@/lib/types';
import { generateUUID } from '@/lib/utils';

function createMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: generateUUID(),
    role: 'assistant',
    content: '',
    citations: [],
    status: 'streaming',
    ...overrides,
  };
}

function initialState(sessionId: string): ChatState {
  return {
    messages: [],
    sessionId,
    statusMessage: null,
    isStreaming: false,
  };
}

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'ADD_USER_MESSAGE': {
      const userMessage = createMessage({
        role: 'user',
        content: action.text,
        status: 'done',
      });
      return {
        ...state,
        messages: [...state.messages, userMessage],
      };
    }

    case 'CREATE_ASSISTANT_MESSAGE': {
      const assistantMessage = createMessage({
        role: 'assistant',
        content: '',
        citations: [],
        status: 'streaming',
      });
      return {
        ...state,
        messages: [...state.messages, assistantMessage],
        isStreaming: true,
      };
    }

    case 'APPEND_TOKEN': {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (last && last.role === 'assistant') {
        messages[messages.length - 1] = {
          ...last,
          content: last.content + action.text,
        };
      } else {
        console.warn('APPEND_TOKEN: no assistant message to append to');
      }
      return { ...state, messages };
    }

    case 'ADD_CITATION': {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (last && last.role === 'assistant') {
        messages[messages.length - 1] = {
          ...last,
          citations: [...last.citations, action.citation],
        };
      } else {
        console.warn('ADD_CITATION: no assistant message to add citation to');
      }
      return { ...state, messages };
    }

    case 'SET_STREAMING_DONE': {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (last && last.role === 'assistant') {
        // Preserve accumulated citations if backend sent none/filtered.
        // The backend may return empty citations when the model uses
        // non-standard marker formats (e.g. [[CITATION N]] vs [[CITATION:N]]).
        const backendCitations: Citation[] | undefined = action.citations;
        const finalCitations: Citation[] =
          backendCitations !== undefined && backendCitations.length > 0
            ? backendCitations
            : last.citations;
        messages[messages.length - 1] = {
          ...last,
          ...(action.fullText !== undefined ? { content: action.fullText } : {}),
          citations: finalCitations,
          status: 'done',
        };
      }
      return {
        ...state,
        messages,
        statusMessage: null,
        isStreaming: false,
      };
    }

    case 'SET_ERROR': {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (last && last.role === 'assistant') {
        messages[messages.length - 1] = {
          ...last,
          status: 'error',
          errorMessage: action.message,
        };
      } else {
        console.warn('SET_ERROR: no assistant message to attach error to');
      }
      return {
        ...state,
        messages,
        statusMessage: null,
        isStreaming: false,
      };
    }

    case 'SET_WARNING': {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (last && last.role === 'assistant') {
        messages[messages.length - 1] = {
          ...last,
          warningMessage: action.message,
        };
      }
      return { ...state, messages };
    }

    case 'SET_STATUS': {
      return {
        ...state,
        statusMessage: action.status,
      };
    }

    case 'HIDE_STATUS': {
      return {
        ...state,
        statusMessage: null,
      };
    }

    case 'CLEAR_CHAT': {
      return {
        ...initialState(action.sessionId || state.sessionId),
      };
    }

    case 'LOAD_SESSION': {
      return {
        ...state,
        messages: action.messages,
        ...(action.sessionId ? { sessionId: action.sessionId } : {}),
      };
    }

    case 'SET_SESSION_ID': {
      return {
        ...state,
        sessionId: action.sessionId,
      };
    }

    default:
      return state;
  }
}

export function useChatReducer(initialSessionId?: string) {
  const [state, dispatch] = useReducer(
    chatReducer,
    initialSessionId || generateUUID(),
    initialState
  );

  const addUserMessage = useCallback(
    (text: string) => dispatch({ type: 'ADD_USER_MESSAGE', text }),
    []
  );

  const createAssistantMessage = useCallback(
    () => dispatch({ type: 'CREATE_ASSISTANT_MESSAGE' }),
    []
  );

  const appendToken = useCallback(
    (text: string) => dispatch({ type: 'APPEND_TOKEN', text }),
    []
  );

  const addCitation = useCallback(
    (citation: Citation) => dispatch({ type: 'ADD_CITATION', citation }),
    []
  );

  const setStreamingDone = useCallback(
    (fullText?: string, citations?: Citation[]) =>
      dispatch({ type: 'SET_STREAMING_DONE', fullText, citations }),
    []
  );

  const setError = useCallback(
    (message: string) => dispatch({ type: 'SET_ERROR', message }),
    []
  );

  const setWarning = useCallback(
    (message: string) => dispatch({ type: 'SET_WARNING', message }),
    []
  );

  const setStatus = useCallback(
    (status: string) => dispatch({ type: 'SET_STATUS', status }),
    []
  );

  const hideStatus = useCallback(
    () => dispatch({ type: 'HIDE_STATUS' }),
    []
  );

  const clearChat = useCallback(
    (sessionId?: string) => dispatch({ type: 'CLEAR_CHAT', sessionId }),
    []
  );

  const loadSession = useCallback(
    (messages: Message[], sessionId?: string) =>
      dispatch({ type: 'LOAD_SESSION', messages, sessionId }),
    []
  );

  const setSessionId = useCallback(
    (sessionId: string) => dispatch({ type: 'SET_SESSION_ID', sessionId }),
    []
  );

  return {
    state,
    addUserMessage,
    createAssistantMessage,
    appendToken,
    addCitation,
    setStreamingDone,
    setError,
    setWarning,
    setStatus,
    hideStatus,
    clearChat,
    loadSession,
    setSessionId,
  };
}
