import { z } from 'zod';

export const supplierListingProductCategoryFailReasonSchema = z.enum([
  'INVALID_PRODUCT_CATEGORY_PATH',
]);

export type SupplierListingProductCategoryFailReason = z.infer<
  typeof supplierListingProductCategoryFailReasonSchema
>;
