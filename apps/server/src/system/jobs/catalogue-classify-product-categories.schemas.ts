import { z } from 'zod';

export const catalogueClassifyProductCategoriesResSchema = z.object({
  ok: z.literal(true),
  listingCount: z.number().int().nonnegative(),
  batchCount: z.number().int().nonnegative(),
  roundCount: z.number().int().nonnegative(),
  confidentCount: z.number().int().nonnegative(),
  needsReviewCount: z.number().int().nonnegative(),
});

export type CatalogueClassifyProductCategoriesRes = z.infer<
  typeof catalogueClassifyProductCategoriesResSchema
>;
