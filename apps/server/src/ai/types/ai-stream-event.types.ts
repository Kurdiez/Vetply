export type AiTextDeltaEvent = {
  type: 'text_delta';
  text: string;
};

export type AiToolCallEvent = {
  type: 'tool_call';
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type AiToolResultEvent = {
  type: 'tool_result';
  id: string;
  name: string;
  result: unknown;
};

export type AiDoneEvent = {
  type: 'done';
};

export type AiStreamEvent =
  | AiTextDeltaEvent
  | AiToolCallEvent
  | AiToolResultEvent
  | AiDoneEvent;
