import { z } from 'zod';
import { Supplier } from './supplier';

export const NVS_IMPORT_BATCH_MAX = 500;
export const VEENAK_IMPORT_BATCH_MAX = 500;

export const nvsImportRowSchema = z.object({
  salesGroup: z.string(),
  partNo: z.string(),
  description: z.string(),
  uom: z.string(),
  vpp: z.string(),
  pom: z.string(),
  manufacturer: z.string(),
  legalLabel: z.string(),
});

export type NvsImportRow = z.infer<typeof nvsImportRowSchema>;

export const veenakImportRowSchema = z.object({
  productName: z.string(),
  packSize: z.string(),
  form: z.string(),
  productId: z.string(),
  newPrice: z.string(),
});

export type VeenakImportRow = z.infer<typeof veenakImportRowSchema>;

const importSupplierPricesNvsBatchSchema = z.object({
  supplier: z.literal(Supplier.NVS),
  batchIndex: z.number().int().nonnegative(),
  totalBatches: z.number().int().positive(),
  totalDataRows: z.number().int().nonnegative(),
  rows: z.array(nvsImportRowSchema).min(1).max(NVS_IMPORT_BATCH_MAX),
});

const importSupplierPricesVeenakBatchSchema = z.object({
  supplier: z.literal(Supplier.VEENAK),
  batchIndex: z.number().int().nonnegative(),
  totalBatches: z.number().int().positive(),
  totalDataRows: z.number().int().nonnegative(),
  rows: z.array(veenakImportRowSchema).min(1).max(VEENAK_IMPORT_BATCH_MAX),
});

export const importSupplierPricesBatchReqSchema = z
  .discriminatedUnion('supplier', [
    importSupplierPricesNvsBatchSchema,
    importSupplierPricesVeenakBatchSchema,
  ])
  .refine((d) => d.batchIndex < d.totalBatches, {
    message: 'batchIndex must be less than totalBatches',
  });

export type ImportSupplierPricesBatchReq = z.infer<
  typeof importSupplierPricesBatchReqSchema
>;

export const importSupplierPricesBatchResSchema = z.object({
  batchIndex: z.number().int().nonnegative(),
  rowsImported: z.number().int().nonnegative(),
  rowsSkipped: z.number().int().nonnegative(),
  skipReasonsSample: z.array(z.string()).max(50),
});

export type ImportSupplierPricesBatchRes = z.infer<
  typeof importSupplierPricesBatchResSchema
>;
