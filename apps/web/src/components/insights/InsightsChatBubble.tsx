'use client';

import { InsightsMessageContent } from './InsightsMessageContent';
import type { InsightsDisplayedMessage } from './insights-chat.types';

type InsightsChatBubbleProps = {
  message: InsightsDisplayedMessage;
  resolveProductHref?: (productId: string) => string | null;
};

export function InsightsChatBubble({
  message,
  resolveProductHref,
}: InsightsChatBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={
          isUser
            ? 'max-w-[85%] rounded-2xl bg-primary-600 px-4 py-3 text-white'
            : 'max-w-[85%] rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10'
        }
      >
        {!isUser ? (
          <p className="mb-1 text-xs font-medium tracking-wide text-gray-400 uppercase">
            Assistant
            {message.isStreaming ? ' · typing' : ''}
          </p>
        ) : null}
        {message.content.length > 0 ? (
          <InsightsMessageContent
            content={message.content}
            resolveProductHref={isUser ? undefined : resolveProductHref}
          />
        ) : (
          <p className="text-sm/6 text-gray-400">…</p>
        )}
      </div>
    </div>
  );
}
