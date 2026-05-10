import { z } from "zod";
import {
  supplierListingFilterSchema,
  supplierListingSortSchema,
} from "./supplier-listings-list-filters.schemas";

export const CATALOGUE_SUPPLIER_LISTINGS_DEFAULT_PAGE_SIZE = 50;

const MAX_NAME_SEARCH_LEN = 512;

const optionalNameSearchQuery = z.preprocess((val: unknown) => {
  if (val === undefined || val === null || val === "") {
    return undefined;
  }
  const s = Array.isArray(val) ? val[0] : String(val);
  const t = s.trim();
  return t === "" ? undefined : t.slice(0, MAX_NAME_SEARCH_LEN);
}, z.string().max(MAX_NAME_SEARCH_LEN).optional());

function optionalQueryJson<T extends z.ZodTypeAny>(schema: T, label: string) {
  return z
    .string()
    .optional()
    .transform((str, ctx) => {
      if (str === undefined || str === "") {
        return undefined;
      }
      try {
        const parsed: unknown = JSON.parse(str);
        const r = schema.safeParse(parsed);
        if (!r.success) {
          r.error.issues.forEach((issue) =>
            ctx.addIssue({
              ...issue,
              path: [label, ...issue.path],
            }),
          );
          return undefined;
        }
        return r.data;
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} must be valid JSON`,
          path: [label],
        });
        return undefined;
      }
    });
}

export const catalogueSupplierListingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(CATALOGUE_SUPPLIER_LISTINGS_DEFAULT_PAGE_SIZE),
  q: optionalNameSearchQuery,
  filters: optionalQueryJson(
    z.array(supplierListingFilterSchema),
    "filters",
  ).optional(),
  sort: optionalQueryJson(supplierListingSortSchema, "sort").optional(),
});

export type CatalogueSupplierListingsQuery = z.infer<
  typeof catalogueSupplierListingsQuerySchema
>;

export const catalogueSupplierListingsQueryInputSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(CATALOGUE_SUPPLIER_LISTINGS_DEFAULT_PAGE_SIZE),
  q: z
    .string()
    .max(MAX_NAME_SEARCH_LEN)
    .optional()
    .transform((s) => {
      if (s === undefined) {
        return undefined;
      }
      const t = s.trim();
      return t === "" ? undefined : t;
    }),
  filters: z.array(supplierListingFilterSchema).optional(),
  sort: supplierListingSortSchema.optional(),
});

export type CatalogueSupplierListingsQueryInput = z.infer<
  typeof catalogueSupplierListingsQueryInputSchema
>;

export const catalogueSupplierListingListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  supplierName: z.string(),
  supplierProductId: z.string(),
  listedPrice: z.string().nullable(),
  catalogProductName: z.string().nullable(),
  thumbnailImage: z.string().max(2048).nullable(),
});

export type CatalogueSupplierListingListItem = z.infer<
  typeof catalogueSupplierListingListItemSchema
>;

export const catalogueSupplierListingsListResSchema = z.object({
  items: z.array(catalogueSupplierListingListItemSchema),
  totalCount: z.number().int().nonnegative(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});

export type CatalogueSupplierListingsListRes = z.infer<
  typeof catalogueSupplierListingsListResSchema
>;
