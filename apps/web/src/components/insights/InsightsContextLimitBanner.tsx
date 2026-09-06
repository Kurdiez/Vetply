'use client';

import { Button } from '@/components/ui/Button';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { InsightsContextBudgetStatus } from './insights-context-budget';

type InsightsContextLimitBannerProps = {
  status: InsightsContextBudgetStatus;
  estimatedTokens: number;
  hardLimitTokens: number;
  onReset: () => void;
};

export function InsightsContextLimitBanner({
  status,
  estimatedTokens,
  hardLimitTokens,
  onReset,
}: InsightsContextLimitBannerProps) {
  if (status === 'ok') {
    return null;
  }

  if (status === 'warning') {
    return (
      <div
        role="status"
        className="flex items-start gap-3 rounded-md bg-amber-500/10 px-3 py-2 ring-1 ring-amber-500/30"
      >
        <ExclamationTriangleIcon
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-amber-300"
        />
        <p className="text-sm text-amber-100">
          This conversation is nearing the estimated context limit (~
          {formatTokenCount(estimatedTokens)} /{' '}
          {formatTokenCount(hardLimitTokens)} tokens). Consider starting a new
          chat soon.
        </p>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-md bg-red-500/10 px-3 py-3 ring-1 ring-red-500/40 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-red-300"
        />
        <p className="text-sm text-red-100">
          This chat has reached the estimated context limit (~
          {formatTokenCount(estimatedTokens)} /{' '}
          {formatTokenCount(hardLimitTokens)} tokens).{' '}
          <button
            type="button"
            onClick={onReset}
            className="font-medium text-white underline underline-offset-2 hover:text-red-50"
          >
            Click here to reset
          </button>
          .
        </p>
      </div>
      <Button type="button" variant="secondary" onClick={onReset}>
        Reset
      </Button>
    </div>
  );
}

function formatTokenCount(tokens: number): string {
  return new Intl.NumberFormat('en-US').format(tokens);
}
