import {
  CATALOGUE_FILTER_BOOLEAN_OPERATORS,
  CATALOGUE_FILTER_ENUM_OPERATORS,
  CATALOGUE_FILTER_STRING_FIELDS,
  CATALOGUE_FILTER_STRING_OPERATORS,
  CatalogueFilterFieldId,
  CatalogueFilterOperator,
  catalogueProductFilterSchema,
  type CatalogueProductFilter,
  LegalCategory,
  SalesCategory,
  Supplier,
} from "@vetply/shared";

export { CatalogueFilterFieldId, CatalogueFilterOperator } from "@vetply/shared";

export const SALES_CATEGORY_OPTIONS = Object.values(SalesCategory) as SalesCategory[];
export const LEGAL_CATEGORY_OPTIONS = Object.values(LegalCategory) as LegalCategory[];
export const SUPPLIER_OPTIONS = Object.values(Supplier) as Supplier[];

export type FieldKind = "string" | "enum" | "boolean";

export const STRING_FIELDS = CATALOGUE_FILTER_STRING_FIELDS;

export function getFieldKind(fieldId: CatalogueFilterFieldId): FieldKind {
  if (fieldId === CatalogueFilterFieldId.Pom) {
    return "boolean";
  }
  if (
    fieldId === CatalogueFilterFieldId.SalesCategory ||
    fieldId === CatalogueFilterFieldId.LegalCategory
  ) {
    return "enum";
  }
  return "string";
}

export function operatorsForField(
  fieldId: CatalogueFilterFieldId,
): readonly CatalogueFilterOperator[] {
  const kind = getFieldKind(fieldId);
  if (kind === "boolean") {
    return CATALOGUE_FILTER_BOOLEAN_OPERATORS;
  }
  if (kind === "enum") {
    return CATALOGUE_FILTER_ENUM_OPERATORS;
  }
  return CATALOGUE_FILTER_STRING_OPERATORS;
}

export function defaultOperatorForField(
  fieldId: CatalogueFilterFieldId,
): CatalogueFilterOperator {
  return (
    operatorsForField(fieldId)[0] ?? CatalogueFilterOperator.IsExactly
  );
}

export type AppliedFilter =
  | {
      id: string;
      kind: "string";
      fieldId:
        | typeof CatalogueFilterFieldId.ManufacturerName
        | typeof CatalogueFilterFieldId.Supplier
        | typeof CatalogueFilterFieldId.BestSupplier;
      operator: CatalogueFilterOperator;
      value: string | string[];
    }
  | {
      id: string;
      kind: "enum";
      fieldId: typeof CatalogueFilterFieldId.SalesCategory;
      operator: CatalogueFilterOperator;
      value: SalesCategory | SalesCategory[];
    }
  | {
      id: string;
      kind: "enum";
      fieldId: typeof CatalogueFilterFieldId.LegalCategory;
      operator: CatalogueFilterOperator;
      value: LegalCategory | LegalCategory[];
    }
  | {
      id: string;
      kind: "boolean";
      fieldId: typeof CatalogueFilterFieldId.Pom;
      operator: CatalogueFilterOperator;
      value: boolean;
    };

export type CatalogueSortFieldId = CatalogueFilterFieldId;

export function appliedFiltersToApiPayload(
  filters: AppliedFilter[],
): CatalogueProductFilter[] {
  return filters.map(({ id: _id, ...rest }) =>
    catalogueProductFilterSchema.parse(rest),
  );
}

export type CatalogueListStubPayload = {
  page: number;
  pageSize: number;
  sort: { fieldId: CatalogueSortFieldId; direction: "asc" | "desc" } | null;
  filters: AppliedFilter[];
};

export function logCatalogueListRequestPayload(payload: CatalogueListStubPayload): void {
  console.log("[catalogue] list request (stub)", payload);
}

export function formatOperandSummary(filter: AppliedFilter): string {
  if (filter.kind === "boolean") {
    return filter.value ? "Yes" : "No";
  }
  if (Array.isArray(filter.value)) {
    return filter.value.join(", ");
  }
  return filter.value;
}

const FIELD_LABELS: Record<CatalogueFilterFieldId, string> = {
  [CatalogueFilterFieldId.Name]: "Name",
  [CatalogueFilterFieldId.ManufacturerName]: "Manufacturer",
  [CatalogueFilterFieldId.Supplier]: "Supplier",
  [CatalogueFilterFieldId.BestSupplier]: "Best supplier",
  [CatalogueFilterFieldId.SalesCategory]: "Sales category",
  [CatalogueFilterFieldId.LegalCategory]: "Legal category",
  [CatalogueFilterFieldId.Pom]: "POM",
};

const OPERATOR_LABELS: Record<CatalogueFilterOperator, string> = {
  [CatalogueFilterOperator.IsExactly]: "is exactly",
  [CatalogueFilterOperator.IsDistinctFrom]: "is distinct from",
  [CatalogueFilterOperator.Contains]: "contains",
  [CatalogueFilterOperator.DoesNotContain]: "does not contain",
  [CatalogueFilterOperator.ContainsAnyOf]: "contains any one of",
  [CatalogueFilterOperator.DoesNotContainAnyOf]: "does not contain any of",
};

export function formatAppliedFilterDisplayParts(filter: AppliedFilter): {
  field: string;
  operator: string;
  operands: string;
} {
  return {
    field: FIELD_LABELS[filter.fieldId],
    operator: OPERATOR_LABELS[filter.operator],
    operands: formatOperandSummary(filter),
  };
}

export function formatAppliedFilterLabel(filter: AppliedFilter): string {
  const { field, operator, operands } = formatAppliedFilterDisplayParts(filter);
  return `${field} ${operator} ${operands}`;
}
