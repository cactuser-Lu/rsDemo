export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
}

export const createMessage = (content: string, role: 'user' | 'assistant'): Message => ({
  id: `msg-${Date.now()}`,
  content,
  role,
  timestamp: Date.now()
});
