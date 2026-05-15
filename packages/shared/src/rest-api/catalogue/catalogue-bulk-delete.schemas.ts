import { z } from 'zod';

export const CATALOGUE_BULK_DELETE_MAX_IDS = 500;

export const catalogueBulkDeleteProductsBodySchema = z.object({
  productIds: z
    .array(z.string().uuid())
    .min(1)
    .max(CATALOGUE_BULK_DELETE_MAX_IDS),
});

export type CatalogueBulkDeleteProductsBody = z.infer<
  typeof catalogueBulkDeleteProductsBodySchema
>;

export const catalogueBulkDeleteProductsResSchema = z.object({
  deletedCount: z.number().int().nonnegative(),
});

export type CatalogueBulkDeleteProductsRes = z.infer<
  typeof catalogueBulkDeleteProductsResSchema
>;
