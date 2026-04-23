import { z } from "zod";

export const catalogueManufacturerOptionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

export type CatalogueManufacturerOption = z.infer<
  typeof catalogueManufacturerOptionSchema
>;

export const catalogueManufacturersListResSchema = z.array(
  catalogueManufacturerOptionSchema,
);

export type CatalogueManufacturersListRes = z.infer<
  typeof catalogueManufacturersListResSchema
>;
