import { z } from "zod";
import {
  CatalogueFilterFieldId,
  CatalogueFilterOperator,
} from "./catalogue-filter.enums";
import { LegalCategory, SalesCategory } from "./enums";

const catalogueFilterFieldIdSchema = z.enum(
  Object.values(CatalogueFilterFieldId) as [
    CatalogueFilterFieldId,
    ...CatalogueFilterFieldId[],
  ],
);

const stringMultiOperators: readonly CatalogueFilterOperator[] = [
  CatalogueFilterOperator.ContainsAnyOf,
  CatalogueFilterOperator.DoesNotContainAnyOf,
];

const enumMultiOperators: readonly CatalogueFilterOperator[] = [
  CatalogueFilterOperator.ContainsAnyOf,
  CatalogueFilterOperator.DoesNotContainAnyOf,
];

export const catalogueProductFilterStringSchema = z
  .object({
    id: z.string().optional(),
    kind: z.literal("string"),
    fieldId: z.union([
      z.literal(CatalogueFilterFieldId.Name),
      z.literal(CatalogueFilterFieldId.ManufacturerName),
    ]),
    operator: z.nativeEnum(CatalogueFilterOperator),
    value: z.union([
      z.string().min(1),
      z.array(z.string().min(1)).min(1),
    ]),
  })
  .superRefine((f, ctx) => {
    const multi = stringMultiOperators.includes(f.operator);
    if (multi) {
      if (!Array.isArray(f.value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "This operator requires multiple values",
          path: ["value"],
        });
      }
    } else if (Array.isArray(f.value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "This operator requires a single value",
        path: ["value"],
      });
    }
  });

export const catalogueProductFilterSalesEnumSchema = z
  .object({
    id: z.string().optional(),
    kind: z.literal("enum"),
    fieldId: z.literal(CatalogueFilterFieldId.SalesCategory),
    operator: z.nativeEnum(CatalogueFilterOperator),
    value: z.union([
      z.nativeEnum(SalesCategory),
      z.array(z.nativeEnum(SalesCategory)).min(1),
    ]),
  })
  .superRefine((f, ctx) => {
    const multi = enumMultiOperators.includes(f.operator);
    if (multi) {
      if (!Array.isArray(f.value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "This operator requires multiple values",
          path: ["value"],
        });
      }
    } else if (Array.isArray(f.value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "This operator requires a single value",
        path: ["value"],
      });
    }
  });

export const catalogueProductFilterLegalEnumSchema = z
  .object({
    id: z.string().optional(),
    kind: z.literal("enum"),
    fieldId: z.literal(CatalogueFilterFieldId.LegalCategory),
    operator: z.nativeEnum(CatalogueFilterOperator),
    value: z.union([
      z.nativeEnum(LegalCategory),
      z.array(z.nativeEnum(LegalCategory)).min(1),
    ]),
  })
  .superRefine((f, ctx) => {
    const multi = enumMultiOperators.includes(f.operator);
    if (multi) {
      if (!Array.isArray(f.value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "This operator requires multiple values",
          path: ["value"],
        });
      }
    } else if (Array.isArray(f.value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "This operator requires a single value",
        path: ["value"],
      });
    }
  });

export const catalogueProductFilterBooleanSchema = z.object({
  id: z.string().optional(),
  kind: z.literal("boolean"),
  fieldId: z.literal(CatalogueFilterFieldId.Pom),
  operator: z.nativeEnum(CatalogueFilterOperator),
  value: z.boolean(),
});

export const catalogueProductFilterSchema = z.union([
  catalogueProductFilterStringSchema,
  catalogueProductFilterSalesEnumSchema,
  catalogueProductFilterLegalEnumSchema,
  catalogueProductFilterBooleanSchema,
]);

export type CatalogueProductFilter = z.infer<typeof catalogueProductFilterSchema>;

export const catalogueSortSchema = z.object({
  fieldId: catalogueFilterFieldIdSchema,
  direction: z.enum(["asc", "desc"]),
});

export type CatalogueSort = z.infer<typeof catalogueSortSchema>;

