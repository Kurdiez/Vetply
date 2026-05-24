import { z } from 'zod';

export const catalogueManufacturerCreateBodySchema = z.object({
  name: z.string().trim().min(1).max(512),
});

export type CatalogueManufacturerCreateBody = z.infer<
  typeof catalogueManufacturerCreateBodySchema
>;
