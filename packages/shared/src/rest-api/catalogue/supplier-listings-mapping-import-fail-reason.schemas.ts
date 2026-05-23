import { z } from 'zod';

export const supplierListingsMappingImportFailReasonSchema = z.enum([
  'DUPLICATE_CATALOGUE_PRODUCT_MAPPING',
]);

export type SupplierListingsMappingImportFailReason = z.infer<
  typeof supplierListingsMappingImportFailReasonSchema
>;

export const supplierListingsMappingImportBusinessErrorBodySchema = z
  .object({
    failReason: supplierListingsMappingImportFailReasonSchema,
  })
  .passthrough();

export type SupplierListingsMappingImportBusinessErrorBody = z.infer<
  typeof supplierListingsMappingImportBusinessErrorBodySchema
>;
