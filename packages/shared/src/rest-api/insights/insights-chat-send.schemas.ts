import { z } from 'zod';
import { insightsChatFailReasonSchema } from './insights-chat-fail-reason.schemas';

const MAX_MESSAGE_CONTENT_LEN = 4000;
const MAX_MESSAGES = 40;

export const insightsChatMessageRoleSchema = z.enum(['user', 'assistant']);

export type InsightsChatMessageRole = z.infer<
  typeof insightsChatMessageRoleSchema
>;

export const insightsChatMessageSchema = z.object({
  role: insightsChatMessageRoleSchema,
  content: z.string().trim().min(1).max(MAX_MESSAGE_CONTENT_LEN),
});

export type InsightsChatMessage = z.infer<typeof insightsChatMessageSchema>;

export const insightsChatSendReqSchema = z.object({
  messages: z.array(insightsChatMessageSchema).min(1).max(MAX_MESSAGES),
});

export type InsightsChatSendReq = z.infer<typeof insightsChatSendReqSchema>;

export const insightsChatTextDeltaEventSchema = z.object({
  type: z.literal('text_delta'),
  text: z.string(),
});

export const insightsChatToolStatusEventSchema = z.object({
  type: z.literal('tool_status'),
  name: z.string(),
  status: z.enum(['started', 'completed']),
});

export const insightsChatDoneEventSchema = z.object({
  type: z.literal('done'),
});

export const insightsChatErrorEventSchema = z.object({
  type: z.literal('error'),
  failReason: insightsChatFailReasonSchema,
});

export const insightsChatStreamEventSchema = z.discriminatedUnion('type', [
  insightsChatTextDeltaEventSchema,
  insightsChatToolStatusEventSchema,
  insightsChatDoneEventSchema,
  insightsChatErrorEventSchema,
]);

export type InsightsChatStreamEvent = z.infer<
  typeof insightsChatStreamEventSchema
>;
