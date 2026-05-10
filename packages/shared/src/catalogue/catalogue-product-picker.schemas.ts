import { z } from "zod";
import { CatalogUnitType, LegalCategory } from "./enums";

const MAX_NAME_SEARCH_LEN = 512;

const optionalNameSearchQuery = z.preprocess((val: unknown) => {
  if (val === undefined || val === null || val === "") {
    return undefined;
  }
  const s = Array.isArray(val) ? val[0] : String(val);
  const t = s.trim();
  return t === "" ? undefined : t.slice(0, MAX_NAME_SEARCH_LEN);
}, z.string().max(MAX_NAME_SEARCH_LEN).optional());

function optionalEnumQuery<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((val: unknown) => {
    if (val === undefined || val === null || val === "") {
      return undefined;
    }
    const s = Array.isArray(val) ? val[0] : String(val);
    return s.trim() === "" ? undefined : s;
  }, schema.optional());
}

export const catalogueProductPickerQuerySchema = z.object({
  q: optionalNameSearchQuery,
  legalCategory: optionalEnumQuery(z.nativeEnum(LegalCategory)),
  unitType: optionalEnumQuery(z.nativeEnum(CatalogUnitType)),
  unitQuantity: z.preprocess((val: unknown) => {
    if (val === undefined || val === null || val === "") {
      return undefined;
    }
    const s = Array.isArray(val) ? val[0] : String(val);
    const t = s.trim();
    return t === "" ? undefined : t;
  }, z.string().min(1).optional()),
});

export type CatalogueProductPickerQuery = z.infer<
  typeof catalogueProductPickerQuerySchema
>;

export const catalogueProductPickerQueryInputSchema = z.object({
  q: z
    .string()
    .max(MAX_NAME_SEARCH_LEN)
    .optional()
    .transform((s) => {
      if (s === undefined) {
        return undefined;
      }
      const t = s.trim();
      return t === "" ? undefined : t.slice(0, MAX_NAME_SEARCH_LEN);
    }),
  legalCategory: z.nativeEnum(LegalCategory).optional(),
  unitType: z.nativeEnum(CatalogUnitType).optional(),
  unitQuantity: z
    .string()
    .optional()
    .transform((s) => {
      if (s === undefined) {
        return undefined;
      }
      const t = s.trim();
      return t === "" ? undefined : t;
    }),
});

export type CatalogueProductPickerQueryInput = z.infer<
  typeof catalogueProductPickerQueryInputSchema
>;

export const catalogueProductPickerItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  legalCategory: z.nativeEnum(LegalCategory).nullable(),
  unitType: z.nativeEnum(CatalogUnitType),
  unitQuantity: z.string(),
  image: z.string().max(2048).nullable(),
  manufacturerName: z.string().nullable(),
});

export type CatalogueProductPickerItem = z.infer<
  typeof catalogueProductPickerItemSchema
>;

export const catalogueProductPickerListResSchema = z.object({
  items: z.array(catalogueProductPickerItemSchema).max(3),
});

export type CatalogueProductPickerListRes = z.infer<
  typeof catalogueProductPickerListResSchema
>;

export const linkSupplierListingsBodySchema = z.object({
  listingIds: z.array(z.string().uuid()).min(1),
  productId: z.string().uuid(),
});

export type LinkSupplierListingsBody = z.infer<
  typeof linkSupplierListingsBodySchema
>;

export const linkSupplierListingsResSchema = z.object({
  linkedCount: z.number().int().nonnegative(),
});

export type LinkSupplierListingsRes = z.infer<
  typeof linkSupplierListingsResSchema
>;

export const unlinkSupplierListingsBodySchema = z.object({
  listingIds: z.array(z.string().uuid()).min(1),
});

export type UnlinkSupplierListingsBody = z.infer<
  typeof unlinkSupplierListingsBodySchema
>;

export const unlinkSupplierListingsResSchema = z.object({
  unlinkedCount: z.number().int().nonnegative(),
});

export type UnlinkSupplierListingsRes = z.infer<
  typeof unlinkSupplierListingsResSchema
>;
