import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  InsightsChatMessage,
  InsightsChatStreamEvent,
} from '@vetply/shared';
import { InsightsChatPipelineService } from '../processing/insights-chat-pipeline.service';

/** Filter server logs with this prefix during QA / iteration. */
const LOG_PREFIX = 'INSIGHTS_CHAT';
const LOG_TEXT_PREVIEW_CHARS = 120;

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

  constructor(private readonly pipeline: InsightsChatPipelineService) {}

  async *streamChat(params: {
    sessionId: string;
    userId: string;
    messages: InsightsChatMessage[];
  }): AsyncGenerator<InsightsChatStreamEvent> {
    const turn = this.createTurnContext(params);
    const startedAtMs = Date.now();
    const stats: TurnLogStats = { toolCallCount: 0, replyChars: 0 };

    this.logTurnStart(turn, params.messages);

    try {
      for await (const event of this.pipeline.run({
        sessionId: turn.sessionId,
        turnId: turn.turnId,
        userId: turn.userId,
        messages: params.messages,
      })) {
        this.trackStreamEvent(turn, event, stats);
        yield event;
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

  private createTurnContext(params: {
    sessionId: string;
    userId: string;
  }): ChatTurnContext {
    return {
      sessionId: params.sessionId,
      turnId: this.createTurnId(),
      userId: params.userId,
    };
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

  private trackStreamEvent(
    turn: ChatTurnContext,
    event: InsightsChatStreamEvent,
    stats: TurnLogStats,
  ): void {
    if (event.type === 'tool_status' && event.status === 'started') {
      stats.toolCallCount += 1;
      this.logger.log(
        `${LOG_PREFIX} tool_start ${this.formatLogContext(turn)} name=${event.name}`,
      );
      return;
    }
    if (event.type === 'tool_status' && event.status === 'completed') {
      this.logger.log(
        `${LOG_PREFIX} tool_done ${this.formatLogContext(turn)} name=${event.name}`,
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

  private isMissingApiKeyError(error: unknown): boolean {
    return (
      error instanceof Error &&
      error.message.includes('OPENAI_API_KEY is not configured')
    );
  }
}
