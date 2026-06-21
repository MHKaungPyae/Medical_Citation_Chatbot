export const EXAMPLE_QUESTIONS = [
  'What are the side effects of metformin?',
  'Latest research on migraine treatment?',
  'Is ibuprofen safe during pregnancy?',
];

export const STATUS_MESSAGES = {
  SEARCHING: 'Searching medical information...',
};

export const ERROR_MESSAGES = {
  SERVER_DOWN: 'Could not reach the server. Please check your connection.',
  UNKNOWN: 'Something went wrong. Please try again.',
};

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
