export interface Citation {
  index: number;
  url: string;
  title: string;
  source: 'pubmed' | 'fda';
}

export type MessageStatus = 'streaming' | 'done' | 'error';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  status: MessageStatus;
  errorMessage?: string;
  warningMessage?: string;
}

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

export type ChatAction =
  | { type: 'ADD_USER_MESSAGE'; text: string }
  | { type: 'CREATE_ASSISTANT_MESSAGE' }
  | { type: 'APPEND_TOKEN'; text: string }
  | { type: 'ADD_CITATION'; citation: Citation }
  | { type: 'SET_STREAMING_DONE' }
  | { type: 'SET_ERROR'; message: string }
  | { type: 'SET_WARNING'; message: string }
  | { type: 'SET_STATUS'; status: string }
  | { type: 'HIDE_STATUS' }
  | { type: 'CLEAR_CHAT' }
  | { type: 'LOAD_SESSION'; messages: Message[] };

export interface ChatState {
  messages: Message[];
  sessionId: string;
  statusMessage: string | null;
  isStreaming: boolean;
}
