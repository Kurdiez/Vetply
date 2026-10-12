import { z } from 'zod';

export const covetrusScrapeProductCategoriesResSchema = z.object({
  ok: z.literal(true),
  filePath: z.string(),
  categories: z.array(z.string()),
  categoryCount: z.number().int().nonnegative(),
  nodeCount: z.number().int().nonnegative(),
});

export type CovetrusScrapeProductCategoriesRes = z.infer<
  typeof covetrusScrapeProductCategoriesResSchema
>;
