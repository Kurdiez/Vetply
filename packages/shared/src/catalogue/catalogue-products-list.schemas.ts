import { z } from "zod";
import {
  catalogueProductFilterSchema,
  catalogueSortSchema,
} from "./catalogue-list-filters.schemas";
import { LegalCategory, SalesCategory } from "./enums";

export const CATALOGUE_PRODUCTS_DEFAULT_PAGE_SIZE = 50;

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
  filters: z.array(catalogueProductFilterSchema).optional(),
  sort: catalogueSortSchema.optional(),
});

export type CatalogueProductsListQueryInput = z.infer<
  typeof catalogueProductsListQueryInputSchema
>;

export const catalogueProductListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  manufacturerName: z.string().nullable(),
  salesCategory: z.nativeEnum(SalesCategory).nullable(),
  legalCategory: z.nativeEnum(LegalCategory).nullable(),
  pom: z.boolean().nullable(),
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
