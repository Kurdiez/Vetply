import { z } from 'zod';
import { Supplier } from '../../catalogue/supplier';

export const catalogueSupplierListingsExportQuerySchema = z.object({
  supplier: z.nativeEnum(Supplier),
});

export type CatalogueSupplierListingsExportQuery = z.infer<
  typeof catalogueSupplierListingsExportQuerySchema
>;
