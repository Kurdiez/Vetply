'use client';

import { InsightsChatBubble } from './InsightsChatBubble';
import { InsightsToolStatusBar } from './InsightsToolStatusBar';
import type {
  InsightsDisplayedMessage,
  InsightsToolActivity,
} from './insights-chat.types';

type InsightsChatThreadProps = {
  messages: InsightsDisplayedMessage[];
  toolActivities: InsightsToolActivity[];
  resolveProductHref?: (productId: string) => string | null;
  bottomRef: React.RefObject<HTMLDivElement | null>;
};

export function InsightsChatThread({
  messages,
  toolActivities,
  resolveProductHref,
  bottomRef,
}: InsightsChatThreadProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
      {messages.map((message) => (
        <InsightsChatBubble
          key={message.id}
          message={message}
          resolveProductHref={resolveProductHref}
        />
      ))}
      <InsightsToolStatusBar activities={toolActivities} />
      <div ref={bottomRef} aria-hidden />
    </div>
  );
}
