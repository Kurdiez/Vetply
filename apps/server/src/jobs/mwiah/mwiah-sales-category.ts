import { SalesCategory } from '@vetply/shared';

const CATALOG_SEGMENT_TO_SALES: Record<string, SalesCategory> = {
  'pet-food': SalesCategory.Petfood,
  petfood: SalesCategory.Petfood,
  consumables: SalesCategory.Consumables,
  pharmaceutical: SalesCategory.Pharmaceutical,
  pharmaceuticals: SalesCategory.Pharmaceutical,
  equipment: SalesCategory.Equipment,
  instruments: SalesCategory.Instruments,
  retail: SalesCategory.Retail,
};

export function resolveMwiahSalesCategoryFromCategoryUrl(
  categoryUrl: string,
): SalesCategory {
  let pathname: string;
  try {
    pathname = new URL(categoryUrl).pathname.toLowerCase();
  } catch {
    return SalesCategory.Consumables;
  }
  const segments = pathname.split('/').filter(Boolean);
  const catalogIdx = segments.indexOf('catalog');
  const segment =
    catalogIdx >= 0 && segments[catalogIdx + 1]
      ? segments[catalogIdx + 1]
      : (segments[0] ?? '');
  return CATALOG_SEGMENT_TO_SALES[segment] ?? SalesCategory.Consumables;
}
