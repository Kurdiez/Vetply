import { z } from 'zod';
import { Supplier } from './supplier';

export const NVS_IMPORT_BATCH_MAX = 500;

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

export const importSupplierPricesBatchReqSchema = z
  .object({
    supplier: z.nativeEnum(Supplier),
    batchIndex: z.number().int().nonnegative(),
    totalBatches: z.number().int().positive(),
    totalDataRows: z.number().int().nonnegative(),
    rows: z.array(nvsImportRowSchema).min(1).max(NVS_IMPORT_BATCH_MAX),
  })
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
