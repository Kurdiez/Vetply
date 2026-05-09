import {
  CATALOGUE_FILTER_STRING_FIELDS,
  CATALOGUE_FILTER_STRING_OPERATORS,
  CatalogueFilterFieldId,
  CatalogueFilterOperator,
  CatalogueListSortFieldId,
  Supplier,
  catalogueProductFilterSchema,
  type CatalogueProductFilter,
} from '@vetply/shared';

export {
  CatalogueFilterFieldId,
  CatalogueFilterOperator,
  CatalogueListSortFieldId,
} from '@vetply/shared';

export type FieldKind = 'string';

export const STRING_FIELDS = CATALOGUE_FILTER_STRING_FIELDS;

export const SUPPLIER_OPTIONS = Object.values(Supplier) as Supplier[];

export function getFieldKind(_fieldId: CatalogueFilterFieldId): FieldKind {
  return 'string';
}

export function operatorsForField(
  _fieldId: CatalogueFilterFieldId,
): readonly CatalogueFilterOperator[] {
  return CATALOGUE_FILTER_STRING_OPERATORS;
}

export function defaultOperatorForField(
  _fieldId: CatalogueFilterFieldId,
): CatalogueFilterOperator {
  return CatalogueFilterOperator.IsExactly;
}

export type AppliedFilter = {
  id: string;
  kind: 'string';
  fieldId:
    | typeof CatalogueFilterFieldId.ManufacturerName
    | typeof CatalogueFilterFieldId.Supplier;
  operator: CatalogueFilterOperator;
  value: string | string[];
};

export type CatalogueSortFieldId = CatalogueListSortFieldId;

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
  sort: { fieldId: CatalogueSortFieldId; direction: 'asc' | 'desc' } | null;
  filters: AppliedFilter[];
};

export function logCatalogueListRequestPayload(
  payload: CatalogueListStubPayload,
): void {
  console.log('[catalogue] list request (stub)', payload);
}

export function formatOperandSummary(filter: AppliedFilter): string {
  if (Array.isArray(filter.value)) {
    return filter.value.join(', ');
  }
  return filter.value;
}

const FIELD_LABELS: Record<CatalogueFilterFieldId, string> = {
  [CatalogueFilterFieldId.ManufacturerName]: 'Manufacturer',
  [CatalogueFilterFieldId.Supplier]: 'Supplier',
};

const OPERATOR_LABELS: Record<CatalogueFilterOperator, string> = {
  [CatalogueFilterOperator.IsExactly]: 'is exactly',
  [CatalogueFilterOperator.IsDistinctFrom]: 'is distinct from',
  [CatalogueFilterOperator.Contains]: 'contains',
  [CatalogueFilterOperator.DoesNotContain]: 'does not contain',
  [CatalogueFilterOperator.ContainsAnyOf]: 'contains any one of',
  [CatalogueFilterOperator.DoesNotContainAnyOf]: 'does not contain any of',
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
