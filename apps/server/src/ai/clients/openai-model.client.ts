import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';
import { ConfigService } from '~/config';
import type {
  AiCompletionRequest,
  AiCompletionResult,
  AiModelClient,
} from './ai-model.client';
import type { AiMessage, AiToolCall } from '../types/ai-message.types';
import type { AiToolDefinition } from '../types/ai-tool.types';

@Injectable()
export class OpenAiModelClient implements AiModelClient {
  private readonly logger = new Logger(OpenAiModelClient.name);
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get('OPENAI_API_KEY');
    this.model = this.configService.get('AI_MODEL');
    this.client = new OpenAI({ apiKey: apiKey || 'missing-openai-api-key' });
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    this.assertApiKeyConfigured();

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: request.messages.map(toOpenAiMessage),
      tools:
        request.tools && request.tools.length > 0
          ? request.tools.map(toOpenAiTool)
          : undefined,
    });

    const choice = response.choices[0]?.message;
    if (!choice) {
      this.logger.warn('OpenAI returned no completion choices');
      return { content: null, toolCalls: [] };
    }

    const toolCalls: AiToolCall[] = (choice.tool_calls ?? [])
      .filter((call) => call.type === 'function')
      .map((call) => ({
        id: call.id,
        name: call.function.name,
        argumentsJson: call.function.arguments,
      }));

    return {
      content: choice.content ?? null,
      toolCalls,
    };
  }

  private assertApiKeyConfigured(): void {
    const apiKey = this.configService.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is not configured; set it in the server environment',
      );
    }
  }
}

function toOpenAiMessage(message: AiMessage): ChatCompletionMessageParam {
  if (message.role === 'system') {
    return { role: 'system', content: message.content };
  }
  if (message.role === 'user') {
    return { role: 'user', content: message.content };
  }
  if (message.role === 'tool') {
    return {
      role: 'tool',
      tool_call_id: message.toolCallId,
      content: message.content,
    };
  }

  return {
    role: 'assistant',
    content: message.content,
    tool_calls:
      message.toolCalls && message.toolCalls.length > 0
        ? message.toolCalls.map((call) => ({
            id: call.id,
            type: 'function' as const,
            function: {
              name: call.name,
              arguments: call.argumentsJson,
            },
          }))
        : undefined,
  };
}

function toOpenAiTool(tool: AiToolDefinition): ChatCompletionTool {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}
