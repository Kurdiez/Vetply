import { Injectable, Logger } from '@nestjs/common';
import type {
  InsightsChatMessage,
  InsightsChatStreamEvent,
} from '@vetply/shared';
import { AiAgentRunnerService } from '~/ai/services/ai-agent-runner.service';
import type { AiMessage } from '~/ai/types/ai-message.types';
import type { AiStreamEvent } from '~/ai/types/ai-stream-event.types';
import { InsightsPromptService } from './insights-prompt.service';
import { InsightsToolRegistry } from '../tools/insights-tool.registry';

@Injectable()
export class InsightsChatService {
  private readonly logger = new Logger(InsightsChatService.name);

  constructor(
    private readonly promptService: InsightsPromptService,
    private readonly toolRegistry: InsightsToolRegistry,
    private readonly agentRunner: AiAgentRunnerService,
  ) {}

  async *streamChat(params: {
    userId: string;
    messages: InsightsChatMessage[];
  }): AsyncGenerator<InsightsChatStreamEvent> {
    this.logger.log(
      `Insights chat turn userId=${params.userId} messages=${params.messages.length}`,
    );

    const agentMessages = this.buildAgentMessages(params.messages);

    try {
      for await (const event of this.agentRunner.run({
        messages: agentMessages,
        tools: this.toolRegistry.getToolDefinitions(),
        executeTool: this.toolRegistry.createExecutor(),
      })) {
        yield this.mapAgentEvent(event);
      }
    } catch (error) {
      this.logger.error(
        `Insights chat failed for userId=${params.userId}`,
        error instanceof Error ? error.stack : undefined,
      );
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
