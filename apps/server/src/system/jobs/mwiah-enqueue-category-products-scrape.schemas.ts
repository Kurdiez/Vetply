import { z } from 'zod';

export const mwiahEnqueueCategoryProductsScrapeBodySchema = z.object({
  url: z.string().url(),
});

export type MwiahEnqueueCategoryProductsScrapeBody = z.infer<
  typeof mwiahEnqueueCategoryProductsScrapeBodySchema
>;

export const mwiahEnqueueCategoryProductsScrapeResSchema = z.object({
  ok: z.literal(true),
  jobId: z.string(),
});

export type MwiahEnqueueCategoryProductsScrapeRes = z.infer<
  typeof mwiahEnqueueCategoryProductsScrapeResSchema
>;
