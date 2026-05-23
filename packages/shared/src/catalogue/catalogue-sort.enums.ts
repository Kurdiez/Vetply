export const CatalogueListSortFieldId = {
  Name: 'name',
  ManufacturerName: 'manufacturerName',
  Supplier: 'supplier',
  CovetrusPrice: 'covetrusPrice',
  NvsPrice: 'nvsPrice',
  VeenakPrice: 'veenakPrice',
} as const;

export type CatalogueListSortFieldId =
  (typeof CatalogueListSortFieldId)[keyof typeof CatalogueListSortFieldId];
