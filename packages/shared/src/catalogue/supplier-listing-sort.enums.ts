export const SupplierListingSortFieldId = {
  ListingName: 'listingName',
  Supplier: 'supplier',
  SupplierProductId: 'supplierProductId',
  ListedPrice: 'listedPrice',
  CatalogProductName: 'catalogProductName',
  ProductCategory: 'productCategory',
  ProductCategoryMapping: 'productCategoryMapping',
} as const;

export type SupplierListingSortFieldId =
  (typeof SupplierListingSortFieldId)[keyof typeof SupplierListingSortFieldId];
