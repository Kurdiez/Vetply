import type { AiMessage } from '../types/ai-message.types';
import type { AiToolDefinition } from '../types/ai-tool.types';
import type { AiToolCall } from '../types/ai-message.types';

export type AiCompletionRequest = {
  messages: AiMessage[];
  tools?: AiToolDefinition[];
};

export type AiCompletionResult = {
  content: string | null;
  toolCalls: AiToolCall[];
};

export interface AiModelClient {
  complete(request: AiCompletionRequest): Promise<AiCompletionResult>;
}
