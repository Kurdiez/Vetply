import type { AppliedFilterRow } from '@/components/ui/filters/AppliedFiltersStack';
import {
  Supplier,
  SupplierListingFilterFieldId,
  SupplierListingPriceOperator,
  SupplierListingStringOperator,
  SupplierListingSupplierOperator,
  type SupplierListingFilter,
} from '@vetply/shared';

export type AppliedSupplierListingFilter = SupplierListingFilter & {
  id: string;
};

export function appliedSupplierListingFiltersToApiPayload(
  filters: AppliedSupplierListingFilter[],
): SupplierListingFilter[] {
  return filters.map((f) => {
    const { id: _id, ...rest } = f;
    return rest as SupplierListingFilter;
  });
}

const FIELD_LABELS: Record<SupplierListingFilterFieldId, string> = {
  [SupplierListingFilterFieldId.Supplier]: 'Supplier',
  [SupplierListingFilterFieldId.SupplierProductId]: 'Supplier product ID',
  [SupplierListingFilterFieldId.ListedPrice]: 'Price',
  [SupplierListingFilterFieldId.CatalogProductName]: 'Catalogue product',
};

const STRING_OP_LABEL: Record<SupplierListingStringOperator, string> = {
  [SupplierListingStringOperator.IsExactly]: 'is exactly',
  [SupplierListingStringOperator.IsDistinctFrom]: 'is distinct from',
  [SupplierListingStringOperator.Contains]: 'contains',
  [SupplierListingStringOperator.DoesNotContain]: 'does not contain',
  [SupplierListingStringOperator.ContainsAnyOf]: 'contains any one of',
  [SupplierListingStringOperator.DoesNotContainAnyOf]:
    'does not contain any of',
};

const SUPPLIER_OP_LABEL: Record<SupplierListingSupplierOperator, string> = {
  [SupplierListingSupplierOperator.IsExactly]: 'is exactly',
  [SupplierListingSupplierOperator.IsDistinctFrom]: 'is distinct from',
};

const PRICE_OP_LABEL: Record<SupplierListingPriceOperator, string> = {
  [SupplierListingPriceOperator.Eq]: '=',
  [SupplierListingPriceOperator.Gt]: '>',
  [SupplierListingPriceOperator.Lt]: '<',
  [SupplierListingPriceOperator.Gte]: '≥',
  [SupplierListingPriceOperator.Lte]: '≤',
};

function operandSummary(value: string | string[]): string {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return value;
}

export function appliedSupplierListingFilterRows(
  filters: AppliedSupplierListingFilter[],
): AppliedFilterRow[] {
  return filters.map((f) => {
    let field: string;
    let operator = '';
    let operands = '';

    switch (f.kind) {
      case 'catalogProductNotLinked':
        field = FIELD_LABELS[SupplierListingFilterFieldId.CatalogProductName];
        operator = 'is not linked';
        operands = '';
        break;
      case 'string':
        field = FIELD_LABELS[f.fieldId];
        operator = STRING_OP_LABEL[f.operator];
        operands = operandSummary(f.value);
        break;
      case 'supplier':
        field = FIELD_LABELS[f.fieldId];
        operator = SUPPLIER_OP_LABEL[f.operator];
        operands = f.value;
        break;
      case 'decimal':
        field = FIELD_LABELS[f.fieldId];
        operator = PRICE_OP_LABEL[f.operator];
        operands = f.value;
        break;
      default:
        field = '';
        break;
    }

    return {
      id: f.id,
      field,
      operator,
      operands,
    };
  });
}

export const SUPPLIER_OPTIONS = Object.values(Supplier) as Supplier[];
