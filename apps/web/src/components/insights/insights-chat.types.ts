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

export function toApiMessages(
  messages: InsightsDisplayedMessage[],
): InsightsChatMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}
