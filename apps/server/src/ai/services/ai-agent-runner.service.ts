import { Inject, Injectable, Logger } from '@nestjs/common';
import { AI_MODEL_CLIENT } from '../ai.tokens';
import type { AiModelClient } from '../clients/ai-model.client';
import type { AiMessage } from '../types/ai-message.types';
import type { AiStreamEvent } from '../types/ai-stream-event.types';
import type { AiToolDefinition, AiToolExecutor } from '../types/ai-tool.types';
import { parseToolArgumentsJson } from '../utils/ai-tool-schema';

const DEFAULT_MAX_TOOL_ROUNDS = 4;

export type AiAgentRunOptions = {
  messages: AiMessage[];
  tools?: AiToolDefinition[];
  executeTool?: AiToolExecutor;
  maxToolRounds?: number;
};

@Injectable()
export class AiAgentRunnerService {
  private readonly logger = new Logger(AiAgentRunnerService.name);

  constructor(
    @Inject(AI_MODEL_CLIENT)
    private readonly modelClient: AiModelClient,
  ) {}

  async *run(options: AiAgentRunOptions): AsyncGenerator<AiStreamEvent> {
    const messages: AiMessage[] = [...options.messages];
    const tools = options.tools ?? [];
    const maxToolRounds = options.maxToolRounds ?? DEFAULT_MAX_TOOL_ROUNDS;
    const executeTool = options.executeTool;

    for (let round = 0; round < maxToolRounds; round += 1) {
      const completion = await this.modelClient.complete({
        messages,
        tools: tools.length > 0 ? tools : undefined,
      });

      if (completion.toolCalls.length > 0) {
        if (!executeTool) {
          throw new Error(
            'Model requested a tool call but no executeTool handler was provided',
          );
        }

        messages.push({
          role: 'assistant',
          content: completion.content,
          toolCalls: completion.toolCalls,
        });

        for (const toolCall of completion.toolCalls) {
          const args = parseToolArgumentsJson(toolCall.argumentsJson);
          yield {
            type: 'tool_call',
            id: toolCall.id,
            name: toolCall.name,
            arguments: args,
          };

          const result = await executeTool(toolCall.name, args);
          yield {
            type: 'tool_result',
            id: toolCall.id,
            name: toolCall.name,
            result,
          };

          messages.push({
            role: 'tool',
            toolCallId: toolCall.id,
            content: JSON.stringify(result),
          });
        }

        continue;
      }

      if (completion.content) {
        yield { type: 'text_delta', text: completion.content };
      }
      yield { type: 'done' };
      return;
    }

    this.logger.warn(
      `AI agent reached max tool rounds (${maxToolRounds}) without a final answer`,
    );
    yield { type: 'done' };
  }
}
