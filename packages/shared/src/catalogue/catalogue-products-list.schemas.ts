import { z } from "zod";
import {
  catalogueProductFilterSchema,
  catalogueSortSchema,
} from "./catalogue-list-filters.schemas";
import { CatalogUnitType, LegalCategory, SalesCategory } from "./enums";

export const CATALOGUE_PRODUCTS_DEFAULT_PAGE_SIZE = 50;

const MAX_NAME_SEARCH_LEN = 512;

/** Optional `q` query param: trimmed ILIKE search on product name. */
const optionalNameSearchQuery = z.preprocess((val: unknown) => {
  if (val === undefined || val === null || val === "") {
    return undefined;
  }
  const s = Array.isArray(val) ? val[0] : String(val);
  const t = s.trim();
  return t === "" ? undefined : t.slice(0, MAX_NAME_SEARCH_LEN);
}, z.string().max(MAX_NAME_SEARCH_LEN).optional());

function optionalQueryJson<T extends z.ZodTypeAny>(
  schema: T,
  label: string,
) {
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

export const catalogueProductsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(CATALOGUE_PRODUCTS_DEFAULT_PAGE_SIZE),
  q: optionalNameSearchQuery,
  filters: optionalQueryJson(
    z.array(catalogueProductFilterSchema),
    "filters",
  ).optional(),
  sort: optionalQueryJson(catalogueSortSchema, "sort").optional(),
});

export type CatalogueProductsListQuery = z.infer<
  typeof catalogueProductsListQuerySchema
>;

export const catalogueProductsListQueryInputSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(CATALOGUE_PRODUCTS_DEFAULT_PAGE_SIZE),
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
  filters: z.array(catalogueProductFilterSchema).optional(),
  sort: catalogueSortSchema.optional(),
});

export type CatalogueProductsListQueryInput = z.infer<
  typeof catalogueProductsListQueryInputSchema
>;

export const catalogueProductListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  image: z.string().max(2048).nullable(),
  manufacturerName: z.string().nullable(),
  salesCategory: z.nativeEnum(SalesCategory).nullable(),
  legalCategory: z.nativeEnum(LegalCategory).nullable(),
  pom: z.boolean().nullable(),
  unitType: z.nativeEnum(CatalogUnitType),
  unitQuantity: z.string(),
  /** Supplier name on a listing that achieves the minimum listed price (deterministic tie-break). */
  bestSupplierName: z.string().nullable(),
  /** Minimum `listed_price` across all supplier listings for this product. */
  bestPrice: z.string().nullable(),
});

export type CatalogueProductListItem = z.infer<
  typeof catalogueProductListItemSchema
>;

export const catalogueProductsListResSchema = z.object({
  items: z.array(catalogueProductListItemSchema),
  totalCount: z.number().int().nonnegative(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});

export type CatalogueProductsListRes = z.infer<
  typeof catalogueProductsListResSchema
>;
