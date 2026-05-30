export const CatalogueListSortFieldId = {
  Name: 'name',
  ManufacturerName: 'manufacturerName',
  Supplier: 'supplier',
  CovetrusPrice: 'covetrusPrice',
  NvsPrice: 'nvsPrice',
  VeenakPrice: 'veenakPrice',
  MwiahPrice: 'mwiahPrice',
} as const;

export type CatalogueListSortFieldId =
  (typeof CatalogueListSortFieldId)[keyof typeof CatalogueListSortFieldId];
