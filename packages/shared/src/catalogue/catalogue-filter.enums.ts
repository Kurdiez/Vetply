export const CatalogueFilterFieldId = {
  ManufacturerName: "manufacturerName",
  Supplier: "supplier",
} as const;

export type CatalogueFilterFieldId =
  (typeof CatalogueFilterFieldId)[keyof typeof CatalogueFilterFieldId];

export const CatalogueFilterOperator = {
  IsExactly: "isExactly",
  IsDistinctFrom: "isDistinctFrom",
  Contains: "contains",
  DoesNotContain: "doesNotContain",
  ContainsAnyOf: "containsAnyOf",
  DoesNotContainAnyOf: "doesNotContainAnyOf",
} as const;

export type CatalogueFilterOperator =
  (typeof CatalogueFilterOperator)[keyof typeof CatalogueFilterOperator];

export const CATALOGUE_FILTER_STRING_FIELDS = [
  CatalogueFilterFieldId.ManufacturerName,
  CatalogueFilterFieldId.Supplier,
] as const satisfies readonly CatalogueFilterFieldId[];

export const CATALOGUE_FILTER_STRING_OPERATORS = [
  CatalogueFilterOperator.IsExactly,
  CatalogueFilterOperator.IsDistinctFrom,
  CatalogueFilterOperator.Contains,
  CatalogueFilterOperator.DoesNotContain,
  CatalogueFilterOperator.ContainsAnyOf,
  CatalogueFilterOperator.DoesNotContainAnyOf,
] as const satisfies readonly CatalogueFilterOperator[];
