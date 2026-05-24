import { z } from 'zod';
import { Supplier } from '../../catalogue/supplier';

export const CATALOGUE_PRODUCTS_IMPORT_BATCH_MAX = 100;
export const SUPPLIER_LISTINGS_MAPPING_IMPORT_BATCH_MAX = 100;

export const catalogueCsvImportRowFailureSchema = z.object({
  /** 1-based data row index in the CSV file (excluding header). */
  rowNumber: z.number().int().positive(),
  column: z.string(),
  value: z.string(),
  message: z.string(),
});

export type CatalogueCsvImportRowFailure = z.infer<
  typeof catalogueCsvImportRowFailureSchema
>;

export const catalogueProductsImportDeleteMissingBodySchema = z.object({
  /** Catalogue product UUIDs present in the CSV. When empty, no products are deleted. */
  productIdsInCsv: z.array(z.string().uuid()),
});

export type CatalogueProductsImportDeleteMissingBody = z.infer<
  typeof catalogueProductsImportDeleteMissingBodySchema
>;

export const catalogueProductsImportDeleteMissingResSchema = z.object({
  deletedCount: z.number().int().nonnegative(),
});

export type CatalogueProductsImportDeleteMissingRes = z.infer<
  typeof catalogueProductsImportDeleteMissingResSchema
>;

export const catalogueProductImportRowSchema = z.object({
  /** 1-based CSV data row (excluding header), for error reporting. */
  rowNumber: z.number().int().positive(),
  /** Empty string = new product (server generates UUID). Otherwise must be a valid UUID. */
  id: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.union([z.literal(''), z.string().uuid()])),
  name: z.string(),
  unit_quantity: z.string(),
  unit_type: z.string(),
  legal_category: z.string(),
  sales_category: z.string(),
  pom: z.string(),
  manufacturer: z.string(),
  image: z.string(),
});

export type CatalogueProductImportRow = z.infer<
  typeof catalogueProductImportRowSchema
>;

const catalogueProductsImportBatchIndexFields = {
  batchIndex: z.number().int().nonnegative(),
  totalBatches: z.number().int().positive(),
  totalDataRows: z.number().int().nonnegative(),
};

export const catalogueProductsImportBatchReqSchema = z
  .object({
    ...catalogueProductsImportBatchIndexFields,
    rows: z
      .array(catalogueProductImportRowSchema)
      .min(1)
      .max(CATALOGUE_PRODUCTS_IMPORT_BATCH_MAX),
  })
  .refine((d) => d.batchIndex < d.totalBatches, {
    message: 'batchIndex must be less than totalBatches',
  });

export type CatalogueProductsImportBatchReq = z.infer<
  typeof catalogueProductsImportBatchReqSchema
>;

export const catalogueProductsImportBatchResSchema = z.object({
  batchIndex: z.number().int().nonnegative(),
  rowsUpserted: z.number().int().nonnegative(),
  rowsFailed: z.number().int().nonnegative(),
  failures: z.array(catalogueCsvImportRowFailureSchema),
});

export type CatalogueProductsImportBatchRes = z.infer<
  typeof catalogueProductsImportBatchResSchema
>;

export const supplierListingsMappingImportRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  catalogue_product_id: z.string(),
  name: z.string(),
  supplier_product_id: z.string(),
  listed_price: z.string(),
  id: z.string().uuid(),
});

export type SupplierListingsMappingImportRow = z.infer<
  typeof supplierListingsMappingImportRowSchema
>;

const supplierListingsMappingBatchIndexFields = {
  batchIndex: z.number().int().nonnegative(),
  totalBatches: z.number().int().positive(),
  totalDataRows: z.number().int().nonnegative(),
};

export const supplierListingsMappingImportBatchReqSchema = z
  .object({
    supplier: z.nativeEnum(Supplier),
    ...supplierListingsMappingBatchIndexFields,
    rows: z
      .array(supplierListingsMappingImportRowSchema)
      .min(1)
      .max(SUPPLIER_LISTINGS_MAPPING_IMPORT_BATCH_MAX),
  })
  .refine((d) => d.batchIndex < d.totalBatches, {
    message: 'batchIndex must be less than totalBatches',
  });

export type SupplierListingsMappingImportBatchReq = z.infer<
  typeof supplierListingsMappingImportBatchReqSchema
>;

export const supplierListingsMappingImportBatchResSchema = z.object({
  batchIndex: z.number().int().nonnegative(),
  rowsUpdated: z.number().int().nonnegative(),
  rowsFailed: z.number().int().nonnegative(),
  failures: z.array(catalogueCsvImportRowFailureSchema),
});

export type SupplierListingsMappingImportBatchRes = z.infer<
  typeof supplierListingsMappingImportBatchResSchema
>;
