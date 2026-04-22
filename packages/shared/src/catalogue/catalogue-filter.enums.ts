export const CatalogueFilterFieldId = {
  Name: 'name',
  ManufacturerName: 'manufacturerName',
  Supplier: 'supplier',
  /** Supplier on a listing that achieves the minimum listed price (ties: any match). */
  BestSupplier: 'bestSupplier',
  SalesCategory: 'salesCategory',
  LegalCategory: 'legalCategory',
  Pom: 'pom',
} as const;

export type CatalogueFilterFieldId =
  (typeof CatalogueFilterFieldId)[keyof typeof CatalogueFilterFieldId];

export const CatalogueFilterOperator = {
  IsExactly: 'isExactly',
  IsDistinctFrom: 'isDistinctFrom',
  Contains: 'contains',
  DoesNotContain: 'doesNotContain',
  ContainsAnyOf: 'containsAnyOf',
  DoesNotContainAnyOf: 'doesNotContainAnyOf',
} as const;

export type CatalogueFilterOperator =
  (typeof CatalogueFilterOperator)[keyof typeof CatalogueFilterOperator];

export const CATALOGUE_FILTER_STRING_FIELDS = [
  CatalogueFilterFieldId.ManufacturerName,
  CatalogueFilterFieldId.Supplier,
  CatalogueFilterFieldId.BestSupplier,
] as const satisfies readonly CatalogueFilterFieldId[];

export const CATALOGUE_FILTER_STRING_OPERATORS = [
  CatalogueFilterOperator.IsExactly,
  CatalogueFilterOperator.IsDistinctFrom,
  CatalogueFilterOperator.Contains,
  CatalogueFilterOperator.DoesNotContain,
  CatalogueFilterOperator.ContainsAnyOf,
  CatalogueFilterOperator.DoesNotContainAnyOf,
] as const satisfies readonly CatalogueFilterOperator[];

export const CATALOGUE_FILTER_ENUM_OPERATORS = [
  CatalogueFilterOperator.IsExactly,
  CatalogueFilterOperator.IsDistinctFrom,
  CatalogueFilterOperator.ContainsAnyOf,
  CatalogueFilterOperator.DoesNotContainAnyOf,
] as const satisfies readonly CatalogueFilterOperator[];

export const CATALOGUE_FILTER_BOOLEAN_OPERATORS = [
  CatalogueFilterOperator.IsExactly,
] as const satisfies readonly CatalogueFilterOperator[];
