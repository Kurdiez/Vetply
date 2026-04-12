import { z } from "zod";
import { CatalogUnitType, LegalCategory, SalesCategory } from "./enums";
import { Supplier } from "./supplier";

export const catalogueProductDetailReqSchema = z.object({
  productId: z.string().uuid(),
});

export type CatalogueProductDetailReq = z.infer<
  typeof catalogueProductDetailReqSchema
>;

const catalogueProductDetailListingSchema = z.object({
  id: z.string().uuid(),
  variantRef: z.string(),
  name: z.string(),
  listedPrice: z.string().nullable(),
});

const catalogueProductDetailVariantInGroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  unitType: z.nativeEnum(CatalogUnitType),
  unitQuantity: z.string(),
  listing: catalogueProductDetailListingSchema,
});

const catalogueProductDetailSupplierGroupSchema = z.object({
  supplier: z.nativeEnum(Supplier),
  variants: z.array(catalogueProductDetailVariantInGroupSchema),
});

export const catalogueProductDetailResSchema = z.object({
  product: z.object({
    id: z.string().uuid(),
    name: z.string(),
    manufacturerName: z.string(),
    salesCategory: z.nativeEnum(SalesCategory),
    legalCategory: z.nativeEnum(LegalCategory),
    pom: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
  supplierGroups: z.array(catalogueProductDetailSupplierGroupSchema),
});

export type CatalogueProductDetailRes = z.infer<
  typeof catalogueProductDetailResSchema
>;
