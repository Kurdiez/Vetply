import type { AiToolDefinition } from '~/ai/types/ai-tool.types';

export type InsightsProcessPhase = 'pre' | 'post';

export type InsightsProcessModuleContext = {
  sessionId: string;
  turnId: string;
  userId: string;
  userPrompt: string;
  conversationSummary: string;
};

export interface InsightsProcessModule {
  readonly name: string;
  readonly phase: InsightsProcessPhase;
  readonly description: string;
  getToolDefinition(): AiToolDefinition;
  execute(
    args: Record<string, unknown>,
    context: InsightsProcessModuleContext,
  ): Promise<unknown>;
}

export interface InsightsPreProcessModule extends InsightsProcessModule {
  readonly phase: 'pre';
}

export interface InsightsPostProcessModule extends InsightsProcessModule {
  readonly phase: 'post';
}

export type PreDecideTurnAction = 'ask_user' | 'proceed_to_search';

export type PreDecideTurnResult = {
  action: PreDecideTurnAction;
  clarifyingMessage: string | null;
  searchHints: string[];
  activatedModuleNames: string[];
};

export type CataloguePhaseSummary = {
  toolCallCount: number;
  searchSummaries: Array<{
    q: string;
    totalCount: number | null;
    returnedCount: number | null;
    truncated: boolean | null;
  }>;
  replyPreview: string;
};
