import { SalesCategory } from '@vetply/shared';
import { z } from 'zod';

export const salesCategoryEnum = z.nativeEnum(SalesCategory);

export const covetrusScrapeEnqueueBodySchema = z
  .object({
    categories: z.array(salesCategoryEnum).optional(),
  })
  .default({});

export type CovetrusScrapeEnqueueBody = z.infer<
  typeof covetrusScrapeEnqueueBodySchema
>;

export const covetrusScrapeEnqueueResSchema = z.object({
  ok: z.literal(true),
  scrapeJobsQueued: z.number(),
  categoryLabels: z.array(z.string()),
  jobIds: z.array(z.string()),
});

export type CovetrusScrapeEnqueueRes = z.infer<
  typeof covetrusScrapeEnqueueResSchema
>;

export function resolveCovetrusScrapeCategoryLabels(
  categories: SalesCategory[] | undefined,
): SalesCategory[] {
  const source =
    categories != null && categories.length > 0
      ? categories
      : (Object.values(SalesCategory) as SalesCategory[]);
  return [...new Set(source)];
}
