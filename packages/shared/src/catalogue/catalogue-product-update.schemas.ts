import { z } from "zod";
import { CatalogUnitType, LegalCategory, SalesCategory } from "./enums";

const emptyToNull = (v: unknown) =>
  v === "" || v === undefined ? null : v;

export const catalogueProductUpdateBodySchema = z.object({
  name: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "Product title cannot be empty").max(1024)),
  manufacturerId: z.preprocess(
    emptyToNull,
    z.string().uuid().nullable(),
  ),
  salesCategory: z.preprocess(
    emptyToNull,
    z.nativeEnum(SalesCategory).nullable(),
  ),
  legalCategory: z.preprocess(
    emptyToNull,
    z.nativeEnum(LegalCategory).nullable(),
  ),
  pom: z.preprocess((v) => {
    if (v === null || v === "" || v === undefined) {
      return null;
    }
    if (v === "true" || v === true) {
      return true;
    }
    if (v === "false" || v === false) {
      return false;
    }
    return v;
  }, z.boolean().nullable()),
  unitType: z.nativeEnum(CatalogUnitType),
  unitQuantity: z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(1, "Unit quantity is required")
        .refine((s) => {
          const n = Number(s);
          return !Number.isNaN(n) && Number.isFinite(n) && n > 0;
        }, "Unit quantity must be a positive number"),
    ),
});

export type CatalogueProductUpdateBody = z.infer<
  typeof catalogueProductUpdateBodySchema
>;
