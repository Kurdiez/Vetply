import { SalesCategory } from '@vetply/shared';

const CANONICAL_LABELS = new Set<string>(Object.values(SalesCategory));

/**
 * NVS catalogue CSV column "Sales Group" values (legacy granular groups) →
 * `sales_category_enum` on `catalogue_products`.
 *
 * Distinct labels sourced from `NVS - Non-POM products.csv`. Tune mappings here for review.
 */
export const NVS_SALES_GROUP_TO_CATEGORY: Readonly<
  Record<string, SalesCategory>
> = {
  Anaesthetics: SalesCategory.Pharmaceutical,
  'Anti-inflammatory': SalesCategory.Pharmaceutical,
  Antimicrobial: SalesCategory.Pharmaceutical,
  Cancer: SalesCategory.Pharmaceutical,
  'Cardiac/Respiratory': SalesCategory.Pharmaceutical,
  'Combi Ecto/Endo - SA': SalesCategory.Pharmaceutical,
  Dental: SalesCategory.Instruments,
  Dermatology: SalesCategory.Pharmaceutical,
  Diagnostics: SalesCategory.Consumables,
  Diets: SalesCategory.Petfood,
  'Ear/Eye': SalesCategory.Pharmaceutical,
  'Ectos - Equine': SalesCategory.Pharmaceutical,
  'Ectos - LA': SalesCategory.Pharmaceutical,
  'Ectos - SA': SalesCategory.Pharmaceutical,
  'Endectos - LA': SalesCategory.Pharmaceutical,
  Endocrine: SalesCategory.Pharmaceutical,
  'Endos - Equine': SalesCategory.Pharmaceutical,
  'Endos - LA': SalesCategory.Pharmaceutical,
  'Endos - SA': SalesCategory.Pharmaceutical,
  GSL: SalesCategory.Retail,
  Gastro: SalesCategory.Pharmaceutical,
  'Instruments/Equipment': SalesCategory.Instruments,
  Misc: SalesCategory.Consumables,
  Musculoskeletal: SalesCategory.Pharmaceutical,
  'NVS Admin': SalesCategory.Consumables,
  Neurology: SalesCategory.Pharmaceutical,
  Nutrients: SalesCategory.Pharmaceutical,
  Obstetrics: SalesCategory.Pharmaceutical,
  Reproduction: SalesCategory.Pharmaceutical,
  Urinary: SalesCategory.Pharmaceutical,
  'Vaccines - Equine': SalesCategory.Pharmaceutical,
  'Vaccines - LA': SalesCategory.Pharmaceutical,
  'Vaccines - SA': SalesCategory.Pharmaceutical,
  'Vascular/Haemorhage': SalesCategory.Pharmaceutical,
  WRS: SalesCategory.Retail,
};

export function resolveNvsSalesCategory(raw: string): SalesCategory | null {
  const t = raw.trim();
  if (t === '') {
    return null;
  }
  if (CANONICAL_LABELS.has(t)) {
    return t as SalesCategory;
  }
  const mapped = NVS_SALES_GROUP_TO_CATEGORY[t];
  return mapped ?? null;
}
