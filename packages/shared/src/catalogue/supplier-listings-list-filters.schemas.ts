import { z } from "zod";
import { Supplier } from "./supplier";
import {
  SupplierListingFilterFieldId,
  SupplierListingPriceOperator,
  SupplierListingStringOperator,
  SupplierListingSupplierOperator,
} from "./supplier-listing-filter.enums";
import { SupplierListingSortFieldId } from "./supplier-listing-sort.enums";

const supplierListingSortFieldIdSchema = z.enum(
  Object.values(SupplierListingSortFieldId) as [
    SupplierListingSortFieldId,
    ...SupplierListingSortFieldId[],
  ],
);

const stringMultiOperators: readonly SupplierListingStringOperator[] = [
  SupplierListingStringOperator.ContainsAnyOf,
  SupplierListingStringOperator.DoesNotContainAnyOf,
];

const supplierListingStringFilterSchema = z
  .object({
    id: z.string().optional(),
    kind: z.literal("string"),
    fieldId: z.union([
      z.literal(SupplierListingFilterFieldId.SupplierProductId),
      z.literal(SupplierListingFilterFieldId.CatalogProductName),
    ]),
    operator: z.nativeEnum(SupplierListingStringOperator),
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

/** UI “Catalogue product → Is not linked” only; maps to `listing.product_id IS NULL`. */
export const supplierListingCatalogProductNotLinkedFilterSchema = z.object({
  id: z.string().optional(),
  kind: z.literal("catalogProductNotLinked"),
});

export const supplierListingSupplierFilterSchema = z.object({
  id: z.string().optional(),
  kind: z.literal("supplier"),
  fieldId: z.literal(SupplierListingFilterFieldId.Supplier),
  operator: z.nativeEnum(SupplierListingSupplierOperator),
  value: z.nativeEnum(Supplier),
});

export const supplierListingPriceFilterSchema = z.object({
  id: z.string().optional(),
  kind: z.literal("decimal"),
  fieldId: z.literal(SupplierListingFilterFieldId.ListedPrice),
  operator: z.nativeEnum(SupplierListingPriceOperator),
  /** Decimal string (matches DB numeric); empty comparisons rejected at API if invalid. */
  value: z.string().min(1),
});

export const supplierListingFilterSchema = z.union([
  supplierListingStringFilterSchema,
  supplierListingSupplierFilterSchema,
  supplierListingPriceFilterSchema,
  supplierListingCatalogProductNotLinkedFilterSchema,
]);

export type SupplierListingFilter = z.infer<typeof supplierListingFilterSchema>;

export const supplierListingSortSchema = z.object({
  fieldId: supplierListingSortFieldIdSchema,
  direction: z.enum(["asc", "desc"]),
});

export type SupplierListingSort = z.infer<typeof supplierListingSortSchema>;
