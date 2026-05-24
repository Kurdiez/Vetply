import { z } from 'zod';
import { createAccountFailReasonSchema } from './auth/account-create.schemas';
import { catalogueManufacturerFailReasonSchema } from './catalogue/catalogue-manufacturer-fail-reason.schemas';
import { supplierListingsMappingImportFailReasonSchema } from './catalogue/supplier-listings-mapping-import-fail-reason.schemas';

export const vetplyFailReasonSchema = z.union([
  createAccountFailReasonSchema,
  catalogueManufacturerFailReasonSchema,
  supplierListingsMappingImportFailReasonSchema,
]);

export type VetplyFailReason = z.infer<typeof vetplyFailReasonSchema>;

export const vetplyBusinessErrorBodySchema = z
  .object({
    failReason: vetplyFailReasonSchema,
  })
  .passthrough();

export type VetplyBusinessErrorBody = z.infer<
  typeof vetplyBusinessErrorBodySchema
>;
