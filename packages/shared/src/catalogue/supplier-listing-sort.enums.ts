export const SupplierListingSortFieldId = {
  ListingName: 'listingName',
  Supplier: 'supplier',
  SupplierProductId: 'supplierProductId',
  ListedPrice: 'listedPrice',
  CatalogProductName: 'catalogProductName',
} as const;

export type SupplierListingSortFieldId =
  (typeof SupplierListingSortFieldId)[keyof typeof SupplierListingSortFieldId];
