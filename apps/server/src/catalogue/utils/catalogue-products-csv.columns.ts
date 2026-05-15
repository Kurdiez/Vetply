import type { CatalogueProductEntity } from '~/database/entities/catalogue/catalogue-product.entity';

export type CatalogueProductCsvColumn = {
  readonly header: string;
  readonly cell: (row: CatalogueProductEntity) => string;
};

function str(v: string | null | undefined): string {
  return v ?? '';
}

function bool(v: boolean | null | undefined): string {
  if (v === null || v === undefined) {
    return '';
  }
  return v ? 'true' : 'false';
}

export const CATALOGUE_PRODUCT_CSV_COLUMNS: readonly CatalogueProductCsvColumn[] =
  [
    { header: 'id', cell: (r) => r.id },
    { header: 'name', cell: (r) => r.name },
    { header: 'unit_quantity', cell: (r) => r.unitQuantity },
    { header: 'unit_type', cell: (r) => r.unitType },
    {
      header: 'legal_category',
      cell: (r) => str(r.legalCategory ?? undefined),
    },
    {
      header: 'sales_category',
      cell: (r) => str(r.salesCategory ?? undefined),
    },
    { header: 'pom', cell: (r) => bool(r.pom) },
    {
      header: 'manufacturer',
      cell: (r) => str(r.manufacturer?.name),
    },
    { header: 'image', cell: (r) => str(r.image) },
  ];
