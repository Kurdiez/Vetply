export type AiToolCall = {
  id: string;
  name: string;
  argumentsJson: string;
};

export type AiSystemMessage = {
  role: 'system';
  content: string;
};

export type AiUserMessage = {
  role: 'user';
  content: string;
};

export type AiAssistantMessage = {
  role: 'assistant';
  content: string | null;
  toolCalls?: AiToolCall[];
};

export type AiToolResultMessage = {
  role: 'tool';
  toolCallId: string;
  content: string;
};

export type AiMessage =
  | AiSystemMessage
  | AiUserMessage
  | AiAssistantMessage
  | AiToolResultMessage;
