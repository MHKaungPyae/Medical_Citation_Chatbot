export const EXAMPLE_QUESTIONS = [
  'What are the side effects of metformin?',
  'Latest research on migraine treatment?',
  'Is ibuprofen safe during pregnancy?',
];

export const STATUS_MESSAGES = {
  SEARCHING: 'Searching PubMed & OpenFDA...',
  STREAMING: 'Generating response...',
  SEARCHING_SLOW: 'Searching (this may take a moment)...',
};

export const ERROR_MESSAGES = {
  TIMEOUT: 'The model took too long to respond. Please try again.',
  SERVER_DOWN: 'Could not reach the server. Please check your connection.',
  UNKNOWN: 'Something went wrong. Please try again.',
  NON_MEDICAL: "Please ask a medical or drug-related question. I'm designed to search PubMed and FDA databases.",
  NO_DATA: 'I could not find relevant medical literature or drug safety data on this topic.',
};

export const WARNING_MESSAGES = {
  NO_LIVE_DATA: 'No live data found — response may be based on training data.',
};

export const STORAGE_KEYS = {
  SESSIONS: 'medical-chatbot-sessions',
  ACTIVE_SESSION: 'medical-chatbot-active-session',
};

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
