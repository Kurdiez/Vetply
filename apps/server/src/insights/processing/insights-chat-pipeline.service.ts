import { Injectable, Logger } from '@nestjs/common';
import type {
  InsightsChatMessage,
  InsightsChatStreamEvent,
} from '@vetply/shared';
import { AiAgentRunnerService } from '~/ai/services/ai-agent-runner.service';
import type { AiMessage } from '~/ai/types/ai-message.types';
import type { AiStreamEvent } from '~/ai/types/ai-stream-event.types';
import { InsightsPromptService } from '../services/insights-prompt.service';
import { InsightsToolRegistry } from '../tools/insights-tool.registry';
import { InsightsProcessModuleRegistry } from './insights-process-module.registry';
import type {
  InsightsProcessModuleContext,
  PreDecideTurnResult,
} from './insights-process-module.types';

const PRE_MAX_TOOL_ROUNDS = 3;
const CATALOGUE_MAX_TOOL_ROUNDS = 4;
const POST_MAX_TOOL_ROUNDS = 2;
const LOG_PREFIX = 'INSIGHTS_PIPELINE';

export type InsightsChatPipelineTurn = {
  sessionId: string;
  turnId: string;
  userId: string;
  messages: InsightsChatMessage[];
};

@Injectable()
export class InsightsChatPipelineService {
  private readonly logger = new Logger(InsightsChatPipelineService.name);

  constructor(
    private readonly promptService: InsightsPromptService,
    private readonly processModuleRegistry: InsightsProcessModuleRegistry,
    private readonly catalogueToolRegistry: InsightsToolRegistry,
    private readonly agentRunner: AiAgentRunnerService,
  ) {}

  async *run(
    turn: InsightsChatPipelineTurn,
  ): AsyncGenerator<InsightsChatStreamEvent> {
    const userPrompt = this.extractLastUserPrompt(turn.messages);
    const moduleContext = this.buildModuleContext(turn, userPrompt);
    const conversationMessages = this.mapConversationMessages(turn.messages);

    const preOutcome = yield* this.runPreProcessPhase(
      turn,
      conversationMessages,
      moduleContext,
    );
    if (preOutcome.action === 'ask_user') {
      yield* this.emitAskUserOutcome(preOutcome);
      return;
    }

    const catalogueMessages = this.buildCatalogueMessages(
      conversationMessages,
      preOutcome,
    );
    const catalogueReply = yield* this.runCataloguePhase(
      turn,
      catalogueMessages,
    );

    const postEmittedText = yield* this.runPostProcessPhase(
      turn,
      catalogueMessages,
      moduleContext,
      preOutcome,
      catalogueReply,
    );

    if (!postEmittedText && catalogueReply.trim().length > 0) {
      yield { type: 'text_delta', text: catalogueReply };
    }
    yield { type: 'done' };
  }

  private async *runPreProcessPhase(
    turn: InsightsChatPipelineTurn,
    conversationMessages: AiMessage[],
    moduleContext: InsightsProcessModuleContext,
  ): AsyncGenerator<InsightsChatStreamEvent, PreDecideTurnResult> {
    this.logger.log(
      `${LOG_PREFIX} pre_start session=${turn.sessionId} turn=${turn.turnId}`,
    );

    let decideResult: PreDecideTurnResult | null = null;
    let streamedText = false;

    const messages: AiMessage[] = [
      {
        role: 'system',
        content: this.promptService.getPreProcessPrompt(),
      },
      ...conversationMessages,
    ];

    for await (const event of this.agentRunner.run({
      messages,
      tools: this.processModuleRegistry.getPreToolDefinitions(),
      executeTool: this.processModuleRegistry.createPreExecutor(moduleContext),
      maxToolRounds: PRE_MAX_TOOL_ROUNDS,
    })) {
      if (
        event.type === 'tool_result' &&
        this.processModuleRegistry.isPreDecideTool(event.name)
      ) {
        decideResult = this.processModuleRegistry.asPreDecideResult(
          event.result,
        );
      }
      if (event.type === 'text_delta' && event.text.trim().length > 0) {
        streamedText = true;
      }
      const mapped = this.mapAgentEvent(event);
      if (mapped) {
        yield mapped;
      }
    }

    const outcome =
      decideResult ??
      ({
        action: 'proceed_to_search',
        clarifyingMessage: null,
        searchHints: [],
        activatedModuleNames: [],
      } satisfies PreDecideTurnResult);

    this.logger.log(
      `${LOG_PREFIX} pre_done session=${turn.sessionId} turn=${turn.turnId} action=${outcome.action} streamedText=${streamedText}`,
    );

    if (outcome.action === 'ask_user' && streamedText) {
      return { ...outcome, clarifyingMessage: null };
    }
    return outcome;
  }

  private async *emitAskUserOutcome(
    preOutcome: PreDecideTurnResult,
  ): AsyncGenerator<InsightsChatStreamEvent> {
    if (preOutcome.clarifyingMessage) {
      yield { type: 'text_delta', text: preOutcome.clarifyingMessage };
    }
    yield { type: 'done' };
  }

  private async *runCataloguePhase(
    turn: InsightsChatPipelineTurn,
    messages: AiMessage[],
  ): AsyncGenerator<InsightsChatStreamEvent, string> {
    this.logger.log(
      `${LOG_PREFIX} catalogue_start session=${turn.sessionId} turn=${turn.turnId}`,
    );

    let reply = '';
    for await (const event of this.agentRunner.run({
      messages,
      tools: this.catalogueToolRegistry.getToolDefinitions(),
      executeTool: this.catalogueToolRegistry.createExecutor(),
      maxToolRounds: CATALOGUE_MAX_TOOL_ROUNDS,
    })) {
      if (event.type === 'text_delta') {
        reply += event.text;
      }
      // Catalogue phase streams tool status only; final wording comes from post phase.
      if (event.type === 'tool_call' || event.type === 'tool_result') {
        const mapped = this.mapAgentEvent(event);
        if (mapped) {
          yield mapped;
        }
      }
    }

    this.logger.log(
      `${LOG_PREFIX} catalogue_done session=${turn.sessionId} turn=${turn.turnId} replyChars=${reply.length}`,
    );
    return reply;
  }

  private async *runPostProcessPhase(
    turn: InsightsChatPipelineTurn,
    catalogueMessages: AiMessage[],
    moduleContext: InsightsProcessModuleContext,
    preOutcome: PreDecideTurnResult,
    catalogueReply: string,
  ): AsyncGenerator<InsightsChatStreamEvent, boolean> {
    this.logger.log(
      `${LOG_PREFIX} post_start session=${turn.sessionId} turn=${turn.turnId}`,
    );

    const messages: AiMessage[] = [
      ...catalogueMessages,
      {
        role: 'system',
        content: this.promptService.getPostProcessPrompt({
          searchHints: preOutcome.searchHints,
          catalogueReplyDraft: catalogueReply,
        }),
      },
    ];

    let emittedText = false;
    for await (const event of this.agentRunner.run({
      messages,
      tools: this.processModuleRegistry.getPostToolDefinitions(),
      executeTool: this.processModuleRegistry.createPostExecutor(moduleContext),
      maxToolRounds: POST_MAX_TOOL_ROUNDS,
    })) {
      if (event.type === 'text_delta' && event.text.trim().length > 0) {
        emittedText = true;
      }
      const mapped = this.mapAgentEvent(event);
      if (mapped) {
        yield mapped;
      }
    }

    this.logger.log(
      `${LOG_PREFIX} post_done session=${turn.sessionId} turn=${turn.turnId} emittedText=${emittedText}`,
    );
    return emittedText;
  }

  private buildModuleContext(
    turn: InsightsChatPipelineTurn,
    userPrompt: string,
  ): InsightsProcessModuleContext {
    return {
      sessionId: turn.sessionId,
      turnId: turn.turnId,
      userId: turn.userId,
      userPrompt,
      conversationSummary: this.buildConversationSummary(turn.messages),
    };
  }

  private buildCatalogueMessages(
    conversationMessages: AiMessage[],
    preOutcome: PreDecideTurnResult,
  ): AiMessage[] {
    return [
      {
        role: 'system',
        content: this.promptService.getCataloguePhasePrompt({
          searchHints: preOutcome.searchHints,
          activatedModuleNames: preOutcome.activatedModuleNames,
        }),
      },
      ...conversationMessages,
    ];
  }

  private extractLastUserPrompt(messages: InsightsChatMessage[]): string {
    const lastUser = [...messages]
      .reverse()
      .find((message) => message.role === 'user');
    return lastUser?.content.trim() ?? '';
  }

  private buildConversationSummary(messages: InsightsChatMessage[]): string {
    return messages
      .slice(-6)
      .map((message) => `${message.role}: ${message.content}`)
      .join('\n');
  }

  private mapConversationMessages(
    messages: InsightsChatMessage[],
  ): AiMessage[] {
    return messages.map(
      (message): AiMessage => ({
        role: message.role,
        content: message.content,
      }),
    );
  }

  private mapAgentEvent(event: AiStreamEvent): InsightsChatStreamEvent | null {
    if (event.type === 'text_delta') {
      return { type: 'text_delta', text: event.text };
    }
    if (event.type === 'tool_call') {
      return {
        type: 'tool_status',
        name: event.name,
        status: 'started',
      };
    }
    if (event.type === 'tool_result') {
      return {
        type: 'tool_status',
        name: event.name,
        status: 'completed',
      };
    }
    // Intermediate agent "done" events are owned by the pipeline phases.
    return null;
  }
}
