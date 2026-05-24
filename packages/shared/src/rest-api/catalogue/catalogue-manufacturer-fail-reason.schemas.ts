import { z } from 'zod';

export const catalogueManufacturerFailReasonSchema = z.enum([
  'DUPLICATE_MANUFACTURER_NAME',
]);

export type CatalogueManufacturerFailReason = z.infer<
  typeof catalogueManufacturerFailReasonSchema
>;
