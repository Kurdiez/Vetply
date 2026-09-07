import type { InsightsChatMessage } from '@vetply/shared';

export type InsightsDisplayedMessage = InsightsChatMessage & {
  id: string;
  isStreaming?: boolean;
};

export type InsightsToolActivity = {
  name: string;
  status: 'started' | 'completed';
};

export function createMessageId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0').slice(-12)}`;
}

export function toApiMessages(
  messages: InsightsDisplayedMessage[],
): InsightsChatMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}
