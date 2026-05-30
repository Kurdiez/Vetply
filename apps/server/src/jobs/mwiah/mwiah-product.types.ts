import type { CatalogUnitType, SalesCategory } from '@vetply/shared';

export type MwiahProductPreview = {
  supplierProductId: string;
  name: string;
  listedPrice: string | null;
  supplierName: string | null;
  legalGroupRaw: string | null;
  categoryUrl: string;
  productUrl: string;
  image: string | null;
  salesCategoryTarget: SalesCategory;
  unitTypeTarget: CatalogUnitType | null;
  unitQuantityTarget: string | null;
};
