'use client';

import { Button } from '@/components/ui/Button';
import { INSIGHTS_SUGGESTED_PROMPTS } from './insights-suggested-prompts';

type InsightsChatEmptyStateProps = {
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
};

export function InsightsChatEmptyState({
  onSelectPrompt,
  disabled = false,
}: InsightsChatEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-2 py-10 text-center">
      <div className="max-w-lg space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-white">
          AI Insights
        </h2>
        <p className="text-sm/6 text-gray-300">
          Ask buying questions grounded in live catalogue listed prices. Try a
          suggested prompt to get started.
        </p>
      </div>
      <ul className="flex w-full max-w-xl flex-col gap-2">
        {INSIGHTS_SUGGESTED_PROMPTS.map((prompt) => (
          <li key={prompt}>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              disabled={disabled}
              onClick={() => onSelectPrompt(prompt)}
              className="!justify-start !text-left whitespace-normal"
            >
              {prompt}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
