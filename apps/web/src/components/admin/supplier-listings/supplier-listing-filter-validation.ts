import {
  Supplier,
  SupplierListingFilterFieldId,
  SupplierListingPriceOperator,
  SupplierListingStringOperator,
  SupplierListingSupplierOperator,
  type SupplierListingFilter,
} from '@vetply/shared';
import type { AppliedSupplierListingFilter } from './supplier-listing-filter-model';

/** UI-only operator for Catalogue product → Is not linked (maps to API kind `catalogProductNotLinked`). */
export const CATALOG_PRODUCT_FILTER_NOT_LINKED_OPERATOR =
  '__catalogProductNotLinked__' as const;

export type SupplierListingsFilterDraft = {
  fieldId: SupplierListingFilterFieldId | '';
  stringOperator:
    | SupplierListingStringOperator
    | typeof CATALOG_PRODUCT_FILTER_NOT_LINKED_OPERATOR
    | '';
  supplierOperator: SupplierListingSupplierOperator | '';
  priceOperator: SupplierListingPriceOperator | '';
  stringSingle: string;
  stringTags: string[];
  supplierSingle: Supplier | '';
  priceValue: string;
};

export function createEmptySupplierListingsDraft(): SupplierListingsFilterDraft {
  return {
    fieldId: '',
    stringOperator: '',
    supplierOperator: '',
    priceOperator: '',
    stringSingle: '',
    stringTags: [],
    supplierSingle: '',
    priceValue: '',
  };
}

function isStringMultiOp(
  op:
    | SupplierListingStringOperator
    | typeof CATALOG_PRODUCT_FILTER_NOT_LINKED_OPERATOR
    | '',
): boolean {
  return (
    op === SupplierListingStringOperator.ContainsAnyOf ||
    op === SupplierListingStringOperator.DoesNotContainAnyOf
  );
}

function normalizeTags(raw: string[]): string[] {
  const seen = new Set<string>();
  for (const t of raw) {
    const s = t.trim();
    if (s.length > 0) {
      seen.add(s);
    }
  }
  return [...seen];
}

export function validateDraftAndBuildSupplierListingFilter(
  draft: SupplierListingsFilterDraft,
  newId: () => string,
):
  | { ok: true; filter: AppliedSupplierListingFilter }
  | { ok: false; message: string } {
  if (draft.fieldId === '') {
    return { ok: false, message: 'Select a field.' };
  }

  const fieldId = draft.fieldId;

  if (fieldId === SupplierListingFilterFieldId.Supplier) {
    const op =
      draft.supplierOperator === SupplierListingSupplierOperator.IsDistinctFrom
        ? SupplierListingSupplierOperator.IsDistinctFrom
        : SupplierListingSupplierOperator.IsExactly;
    if (draft.supplierSingle === '') {
      return { ok: false, message: 'Select a supplier.' };
    }
    const filter: SupplierListingFilter = {
      kind: 'supplier',
      fieldId: SupplierListingFilterFieldId.Supplier,
      operator: op,
      value: draft.supplierSingle,
    };
    return {
      ok: true,
      filter: { ...filter, id: newId() },
    };
  }

  if (fieldId === SupplierListingFilterFieldId.ListedPrice) {
    const op = draft.priceOperator;
    if (
      op !== SupplierListingPriceOperator.Eq &&
      op !== SupplierListingPriceOperator.Gt &&
      op !== SupplierListingPriceOperator.Lt &&
      op !== SupplierListingPriceOperator.Gte &&
      op !== SupplierListingPriceOperator.Lte
    ) {
      return { ok: false, message: 'Select a price comparison.' };
    }
    const pv = draft.priceValue.trim();
    if (pv === '' || Number.isNaN(Number.parseFloat(pv))) {
      return { ok: false, message: 'Enter a valid price.' };
    }
    const filter: SupplierListingFilter = {
      kind: 'decimal',
      fieldId: SupplierListingFilterFieldId.ListedPrice,
      operator: op,
      value: pv,
    };
    return {
      ok: true,
      filter: { ...filter, id: newId() },
    };
  }

  const stringOps: readonly SupplierListingStringOperator[] = [
    SupplierListingStringOperator.IsExactly,
    SupplierListingStringOperator.IsDistinctFrom,
    SupplierListingStringOperator.Contains,
    SupplierListingStringOperator.DoesNotContain,
    SupplierListingStringOperator.ContainsAnyOf,
    SupplierListingStringOperator.DoesNotContainAnyOf,
  ];
  const op = draft.stringOperator;

  if (
    fieldId === SupplierListingFilterFieldId.CatalogProductName &&
    op === CATALOG_PRODUCT_FILTER_NOT_LINKED_OPERATOR
  ) {
    const filter: SupplierListingFilter = {
      kind: 'catalogProductNotLinked',
    };
    return {
      ok: true,
      filter: { ...filter, id: newId() },
    };
  }

  const effectiveOp =
    op && stringOps.includes(op as SupplierListingStringOperator)
      ? op
      : SupplierListingStringOperator.Contains;

  if (isStringMultiOp(effectiveOp)) {
    const tags = normalizeTags(draft.stringTags);
    if (tags.length === 0) {
      return {
        ok: false,
        message: 'Enter at least one value.',
      };
    }
    const filter: SupplierListingFilter = {
      kind: 'string',
      fieldId:
        fieldId === SupplierListingFilterFieldId.SupplierProductId
          ? SupplierListingFilterFieldId.SupplierProductId
          : SupplierListingFilterFieldId.CatalogProductName,
      operator: effectiveOp as SupplierListingStringOperator,
      value: tags,
    };
    return {
      ok: true,
      filter: { ...filter, id: newId() },
    };
  }

  const single = draft.stringSingle.trim();
  if (single === '') {
    return { ok: false, message: 'Enter a value.' };
  }
  const filter: SupplierListingFilter = {
    kind: 'string',
    fieldId:
      fieldId === SupplierListingFilterFieldId.SupplierProductId
        ? SupplierListingFilterFieldId.SupplierProductId
        : SupplierListingFilterFieldId.CatalogProductName,
    operator: effectiveOp as SupplierListingStringOperator,
    value: single,
  };
  return {
    ok: true,
    filter: { ...filter, id: newId() },
  };
}
