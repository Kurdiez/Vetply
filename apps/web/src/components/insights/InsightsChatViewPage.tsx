'use client';

import { Button } from '@/components/ui/Button';
import { useEffect, useRef } from 'react';
import { InsightsChatComposer } from './InsightsChatComposer';
import { InsightsChatEmptyState } from './InsightsChatEmptyState';
import { InsightsChatThread } from './InsightsChatThread';
import { InsightsContextLimitBanner } from './InsightsContextLimitBanner';
import {
  InsightsChatViewProvider,
  useInsightsChatView,
} from './InsightsChatViewContext';

type InsightsChatViewPageProps = {
  resolveProductHref?: (productId: string) => string | null;
};

function InsightsChatViewPageBody() {
  const {
    messages,
    toolActivities,
    isStreaming,
    contextBudget,
    resolveProductHref,
    sendMessage,
    stopStreaming,
    startNewChat,
  } = useInsightsChatView();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, toolActivities, isStreaming]);

  const hasMessages = messages.length > 0;
  const isAtContextLimit = contextBudget.status === 'limit_reached';

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-base/7 font-semibold text-white">AI Insights</h1>
          <p className="mt-1 text-sm/6 text-gray-300">
            Catalogue buying help with listed-price comparisons from live data.
          </p>
        </div>
        {hasMessages ? (
          <Button type="button" variant="secondary" onClick={startNewChat}>
            {isAtContextLimit ? 'Reset' : 'New chat'}
          </Button>
        ) : null}
      </div>

      <InsightsContextLimitBanner
        status={contextBudget.status}
        estimatedTokens={contextBudget.estimatedTokens}
        hardLimitTokens={contextBudget.hardLimitTokens}
        onReset={startNewChat}
      />

      <div className="flex min-h-0 flex-1 flex-col rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
        {hasMessages ? (
          <InsightsChatThread
            messages={messages}
            toolActivities={toolActivities}
            resolveProductHref={resolveProductHref}
            bottomRef={bottomRef}
          />
        ) : (
          <InsightsChatEmptyState
            disabled={isStreaming || isAtContextLimit}
            onSelectPrompt={(prompt) => {
              void sendMessage(prompt);
            }}
          />
        )}
        <InsightsChatComposer
          disabled={isAtContextLimit}
          isStreaming={isStreaming}
          onSend={(content) => {
            void sendMessage(content);
          }}
          onStop={stopStreaming}
        />
      </div>
    </div>
  );
}

export function InsightsChatViewPage({
  resolveProductHref,
}: InsightsChatViewPageProps) {
  return (
    <InsightsChatViewProvider resolveProductHref={resolveProductHref}>
      <InsightsChatViewPageBody />
    </InsightsChatViewProvider>
  );
}
