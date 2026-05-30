import { z } from 'zod';

export const mwiahEnqueueAllScrapeBodySchema = z
  .object({
    startUrl: z.string().url().optional(),
  })
  .default({});

export type MwiahEnqueueAllScrapeBody = z.infer<
  typeof mwiahEnqueueAllScrapeBodySchema
>;

export const mwiahEnqueueAllScrapeResSchema = z.object({
  ok: z.literal(true),
  discoverJobId: z.string(),
});

export type MwiahEnqueueAllScrapeRes = z.infer<
  typeof mwiahEnqueueAllScrapeResSchema
>;
