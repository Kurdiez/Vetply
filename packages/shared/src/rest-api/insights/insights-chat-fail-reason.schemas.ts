import { z } from 'zod';

export const insightsChatFailReasonSchema = z.enum([
  'INSIGHTS_AI_NOT_CONFIGURED',
  'INSIGHTS_CHAT_EMPTY_MESSAGES',
  'INSIGHTS_CHAT_FAILED',
]);

export type InsightsChatFailReason = z.infer<
  typeof insightsChatFailReasonSchema
>;
