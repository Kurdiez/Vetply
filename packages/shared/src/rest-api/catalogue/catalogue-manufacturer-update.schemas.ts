import { z } from 'zod';

export const catalogueManufacturerUpdateBodySchema = z.object({
  name: z.string().trim().min(1).max(512),
});

export type CatalogueManufacturerUpdateBody = z.infer<
  typeof catalogueManufacturerUpdateBodySchema
>;
