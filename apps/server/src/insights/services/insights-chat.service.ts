import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  InsightsChatMessage,
  InsightsChatStreamEvent,
} from '@vetply/shared';
import { AiAgentRunnerService } from '~/ai/services/ai-agent-runner.service';
import type { AiMessage } from '~/ai/types/ai-message.types';
import type { AiStreamEvent } from '~/ai/types/ai-stream-event.types';
import { InsightsPromptService } from './insights-prompt.service';
import { InsightsToolRegistry } from '../tools/insights-tool.registry';

const MAX_TOOL_ROUNDS = 4;
/** Filter server logs with this prefix during QA / iteration. */
const LOG_PREFIX = 'INSIGHTS_CHAT';
const LOG_TEXT_PREVIEW_CHARS = 120;
const LOG_PAYLOAD_PREVIEW_CHARS = 240;

type TurnLogStats = {
  toolCallCount: number;
  replyChars: number;
};

type ChatTurnContext = {
  sessionId: string;
  turnId: string;
  userId: string;
};

@Injectable()
export class InsightsChatService {
  private readonly logger = new Logger(InsightsChatService.name);

  constructor(
    private readonly promptService: InsightsPromptService,
    private readonly toolRegistry: InsightsToolRegistry,
    private readonly agentRunner: AiAgentRunnerService,
  ) {}

  async *streamChat(params: {
    sessionId: string;
    userId: string;
    messages: InsightsChatMessage[];
  }): AsyncGenerator<InsightsChatStreamEvent> {
    const turn: ChatTurnContext = {
      sessionId: params.sessionId,
      turnId: this.createTurnId(),
      userId: params.userId,
    };
    const startedAtMs = Date.now();
    const stats: TurnLogStats = { toolCallCount: 0, replyChars: 0 };

    this.logTurnStart(turn, params.messages);

    const agentMessages = this.buildAgentMessages(params.messages);

    try {
      for await (const event of this.agentRunner.run({
        messages: agentMessages,
        tools: this.toolRegistry.getToolDefinitions(),
        executeTool: this.toolRegistry.createExecutor(),
        maxToolRounds: MAX_TOOL_ROUNDS,
      })) {
        this.logAgentEvent(turn, event, stats);
        yield this.mapAgentEvent(event);
      }
      this.logTurnDone(turn, startedAtMs, stats);
    } catch (error) {
      this.logTurnFailed(turn, startedAtMs, error);
      if (this.isMissingApiKeyError(error)) {
        yield {
          type: 'error',
          failReason: 'INSIGHTS_AI_NOT_CONFIGURED',
        };
        return;
      }
      throw error;
    }
  }

  private createTurnId(): string {
    return randomUUID().slice(0, 8);
  }

  private formatLogContext(turn: ChatTurnContext): string {
    return `session=${turn.sessionId} turn=${turn.turnId}`;
  }

  private logTurnStart(
    turn: ChatTurnContext,
    messages: InsightsChatMessage[],
  ): void {
    const lastUser = [...messages]
      .reverse()
      .find((message) => message.role === 'user');
    this.logger.log(
      `${LOG_PREFIX} start ${this.formatLogContext(turn)} userId=${turn.userId} messages=${messages.length} lastUser="${this.previewText(lastUser?.content ?? '')}"`,
    );
  }

  private logAgentEvent(
    turn: ChatTurnContext,
    event: AiStreamEvent,
    stats: TurnLogStats,
  ): void {
    if (event.type === 'tool_call') {
      stats.toolCallCount += 1;
      this.logger.log(
        `${LOG_PREFIX} tool_start ${this.formatLogContext(turn)} name=${event.name} args=${this.previewPayload(event.arguments)}`,
      );
      return;
    }
    if (event.type === 'tool_result') {
      this.logger.log(
        `${LOG_PREFIX} tool_done ${this.formatLogContext(turn)} name=${event.name} result=${this.previewPayload(event.result)}`,
      );
      return;
    }
    if (event.type === 'text_delta') {
      stats.replyChars += event.text.length;
    }
  }

  private logTurnDone(
    turn: ChatTurnContext,
    startedAtMs: number,
    stats: TurnLogStats,
  ): void {
    const durationMs = Date.now() - startedAtMs;
    this.logger.log(
      `${LOG_PREFIX} done ${this.formatLogContext(turn)} durationMs=${durationMs} toolCalls=${stats.toolCallCount} replyChars=${stats.replyChars}`,
    );
  }

  private logTurnFailed(
    turn: ChatTurnContext,
    startedAtMs: number,
    error: unknown,
  ): void {
    const durationMs = Date.now() - startedAtMs;
    this.logger.error(
      `${LOG_PREFIX} failed ${this.formatLogContext(turn)} userId=${turn.userId} durationMs=${durationMs}`,
      error instanceof Error ? error.stack : undefined,
    );
  }

  private previewText(text: string): string {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (normalized.length <= LOG_TEXT_PREVIEW_CHARS) {
      return normalized;
    }
    return `${normalized.slice(0, LOG_TEXT_PREVIEW_CHARS)}…`;
  }

  private previewPayload(value: unknown): string {
    try {
      const json = JSON.stringify(value);
      if (json === undefined) {
        return 'undefined';
      }
      if (json.length <= LOG_PAYLOAD_PREVIEW_CHARS) {
        return json;
      }
      return `${json.slice(0, LOG_PAYLOAD_PREVIEW_CHARS)}…`;
    } catch {
      return '[unserializable]';
    }
  }

  private buildAgentMessages(messages: InsightsChatMessage[]): AiMessage[] {
    return [
      {
        role: 'system',
        content: this.promptService.getSystemPrompt(),
      },
      ...messages.map(
        (message): AiMessage => ({
          role: message.role,
          content: message.content,
        }),
      ),
    ];
  }

  private mapAgentEvent(event: AiStreamEvent): InsightsChatStreamEvent {
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
    return { type: 'done' };
  }

  private isMissingApiKeyError(error: unknown): boolean {
    return (
      error instanceof Error &&
      error.message.includes('OPENAI_API_KEY is not configured')
    );
  }
}
