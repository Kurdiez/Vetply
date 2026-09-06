/** gpt-4.1-mini published context window. */
export const INSIGHTS_MODEL_CONTEXT_TOKENS = 1_047_576;

/**
 * Leave headroom for system prompt, tool schemas, in-turn tool results,
 * and max completion tokens so the hard limit is a rough client estimate.
 */
const RESERVED_TURN_TOKENS = 64_000;

export const INSIGHTS_CONTEXT_HARD_LIMIT_TOKENS =
  INSIGHTS_MODEL_CONTEXT_TOKENS - RESERVED_TURN_TOKENS;

export const INSIGHTS_CONTEXT_WARN_RATIO = 0.8;

export const INSIGHTS_CONTEXT_WARN_TOKENS = Math.floor(
  INSIGHTS_CONTEXT_HARD_LIMIT_TOKENS * INSIGHTS_CONTEXT_WARN_RATIO,
);

export type InsightsContextBudgetStatus = 'ok' | 'warning' | 'limit_reached';

export type InsightsContextBudget = {
  estimatedTokens: number;
  hardLimitTokens: number;
  warnTokens: number;
  usageRatio: number;
  status: InsightsContextBudgetStatus;
};

/**
 * Rough client-side estimate (~4 chars/token). Not OpenAI's exact tokenizer.
 */
export function estimateTokensFromText(text: string): number {
  if (text.length === 0) {
    return 0;
  }
  return Math.ceil(text.length / 4);
}

export function estimateMessagesTokens(
  messages: ReadonlyArray<{ role: string; content: string }>,
): number {
  let total = 0;
  for (const message of messages) {
    total += 4;
    total += estimateTokensFromText(message.role);
    total += estimateTokensFromText(message.content);
  }
  return total;
}

export function getInsightsContextBudget(
  messages: ReadonlyArray<{ role: string; content: string }>,
  draftText = '',
): InsightsContextBudget {
  const estimatedTokens =
    estimateMessagesTokens(messages) + estimateTokensFromText(draftText);
  const usageRatio =
    INSIGHTS_CONTEXT_HARD_LIMIT_TOKENS > 0
      ? estimatedTokens / INSIGHTS_CONTEXT_HARD_LIMIT_TOKENS
      : 0;

  let status: InsightsContextBudgetStatus = 'ok';
  if (estimatedTokens >= INSIGHTS_CONTEXT_HARD_LIMIT_TOKENS) {
    status = 'limit_reached';
  } else if (estimatedTokens >= INSIGHTS_CONTEXT_WARN_TOKENS) {
    status = 'warning';
  }

  return {
    estimatedTokens,
    hardLimitTokens: INSIGHTS_CONTEXT_HARD_LIMIT_TOKENS,
    warnTokens: INSIGHTS_CONTEXT_WARN_TOKENS,
    usageRatio,
    status,
  };
}
