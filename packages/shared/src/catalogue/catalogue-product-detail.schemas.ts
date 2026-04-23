import { z } from "zod";
import { CatalogUnitType, LegalCategory, SalesCategory } from "./enums";

export const catalogueProductDetailListingSchema = z.object({
  id: z.string().uuid(),
  supplierName: z.string(),
  supplierProductId: z.string(),
  name: z.string(),
  listedPrice: z.string().nullable(),
});

export type CatalogueProductDetailListing = z.infer<
  typeof catalogueProductDetailListingSchema
>;

export const catalogueProductDetailSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  image: z.string().max(2048).nullable(),
  manufacturerId: z.string().uuid().nullable(),
  manufacturerName: z.string().nullable(),
  salesCategory: z.nativeEnum(SalesCategory).nullable(),
  legalCategory: z.nativeEnum(LegalCategory).nullable(),
  pom: z.boolean().nullable(),
  unitType: z.nativeEnum(CatalogUnitType),
  unitQuantity: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  listings: z.array(catalogueProductDetailListingSchema),
});

export type CatalogueProductDetail = z.infer<typeof catalogueProductDetailSchema>;
