/** Filter fields on the supplier listings admin list. */
export const SupplierListingFilterFieldId = {
  Supplier: 'supplier',
  SupplierProductId: 'supplierProductId',
  ListedPrice: 'listedPrice',
  CatalogProductName: 'catalogProductName',
  ProductCategory: 'productCategory',
  ProductCategoryMapping: 'productCategoryMapping',
} as const;

export type SupplierListingFilterFieldId =
  (typeof SupplierListingFilterFieldId)[keyof typeof SupplierListingFilterFieldId];

/** String operators for supplier product id and catalogue product name (same semantics as catalogue string filters). */
export const SupplierListingStringOperator = {
  IsExactly: 'isExactly',
  IsDistinctFrom: 'isDistinctFrom',
  Contains: 'contains',
  DoesNotContain: 'doesNotContain',
  ContainsAnyOf: 'containsAnyOf',
  DoesNotContainAnyOf: 'doesNotContainAnyOf',
} as const;

export type SupplierListingStringOperator =
  (typeof SupplierListingStringOperator)[keyof typeof SupplierListingStringOperator];

/** Decimal comparisons for listed price. */
export const SupplierListingPriceOperator = {
  Eq: 'eq',
  Gt: 'gt',
  Lt: 'lt',
  Gte: 'gte',
  Lte: 'lte',
} as const;

export type SupplierListingPriceOperator =
  (typeof SupplierListingPriceOperator)[keyof typeof SupplierListingPriceOperator];

/** Supplier enum column: match single supplier value. */
export const SupplierListingSupplierOperator = {
  IsExactly: 'isExactly',
  IsDistinctFrom: 'isDistinctFrom',
} as const;

export type SupplierListingSupplierOperator =
  (typeof SupplierListingSupplierOperator)[keyof typeof SupplierListingSupplierOperator];

/** Product-category mapping status (AI mapped / Needs review / Admin mapped). */
export const SupplierListingProductCategoryStatusOperator = {
  IsExactly: 'isExactly',
  IsDistinctFrom: 'isDistinctFrom',
} as const;

export type SupplierListingProductCategoryStatusOperator =
  (typeof SupplierListingProductCategoryStatusOperator)[keyof typeof SupplierListingProductCategoryStatusOperator];
