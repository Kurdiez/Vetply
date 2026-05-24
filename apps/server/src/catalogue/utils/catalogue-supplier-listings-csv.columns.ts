import type { CatalogueProductSupplierListingEntity } from '~/database/entities/catalogue/catalogue-product-supplier-listing.entity';

export type SupplierListingCsvColumn = {
  readonly header: string;
  readonly cell: (row: CatalogueProductSupplierListingEntity) => string;
};

function str(v: string | null | undefined): string {
  return v ?? '';
}

export const SUPPLIER_LISTING_CSV_COLUMNS: readonly SupplierListingCsvColumn[] =
  [
    {
      header: 'catalogue_product_id',
      cell: (r) => str(r.productId),
    },
    { header: 'name', cell: (r) => r.name },
    {
      header: 'supplier_product_id',
      cell: (r) => r.supplierProductId,
    },
    { header: 'listed_price', cell: (r) => str(r.listedPrice ?? undefined) },
    { header: 'id', cell: (r) => r.id },
  ];
