import type { Supplier } from '@vetply/shared';
import {
  CatalogueFilterFieldId,
  CatalogueFilterOperator,
} from '@vetply/shared';
import type { AppliedFilter } from './catalogue-filter-model';
import {
  defaultOperatorForField,
  operatorsForField,
} from './catalogue-filter-model';

export type CatalogueFilterDraft = {
  fieldId: CatalogueFilterFieldId | '';
  operator: CatalogueFilterOperator | '';
  stringSingle: string;
  stringTags: string[];
  supplierSingle: Supplier | '';
  supplierTags: Supplier[];
};

export function createEmptyDraft(): CatalogueFilterDraft {
  return {
    fieldId: '',
    operator: '',
    stringSingle: '',
    stringTags: [],
    supplierSingle: '',
    supplierTags: [],
  };
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

function isStringMultiOperator(op: CatalogueFilterOperator): boolean {
  return (
    op === CatalogueFilterOperator.ContainsAnyOf ||
    op === CatalogueFilterOperator.DoesNotContainAnyOf
  );
}

export function validateDraftAndBuildFilter(
  draft: CatalogueFilterDraft,
  newId: () => string,
): { ok: true; filter: AppliedFilter } | { ok: false; message: string } {
  if (draft.fieldId === '') {
    return { ok: false, message: 'Select a field.' };
  }

  const fieldId = draft.fieldId;
  const allowed = operatorsForField(fieldId);
  const op: CatalogueFilterOperator =
    draft.operator && allowed.includes(draft.operator)
      ? draft.operator
      : defaultOperatorForField(fieldId);

  if (!allowed.includes(op)) {
    return { ok: false, message: 'Select an operator.' };
  }

  if (fieldId === CatalogueFilterFieldId.Supplier) {
    if (isStringMultiOperator(op)) {
      const tags = draft.supplierTags;
      if (tags.length === 0) {
        return {
          ok: false,
          message: 'Select at least one supplier.',
        };
      }
      return {
        ok: true,
        filter: {
          id: newId(),
          kind: 'string',
          fieldId,
          operator: op,
          value: tags,
        },
      };
    }
    if (draft.supplierSingle === '') {
      return { ok: false, message: 'Select a supplier.' };
    }
    return {
      ok: true,
      filter: {
        id: newId(),
        kind: 'string',
        fieldId,
        operator: op,
        value: draft.supplierSingle,
      },
    };
  }

  if (isStringMultiOperator(op)) {
    const tags = normalizeTags(draft.stringTags);
    if (tags.length === 0) {
      return {
        ok: false,
        message: 'Add at least one value for this operator.',
      };
    }
    return {
      ok: true,
      filter: {
        id: newId(),
        kind: 'string',
        fieldId: CatalogueFilterFieldId.ManufacturerName,
        operator: op,
        value: tags,
      },
    };
  }
  const trimmed = draft.stringSingle.trim();
  if (trimmed.length === 0) {
    return { ok: false, message: 'Enter a value.' };
  }
  return {
    ok: true,
    filter: {
      id: newId(),
      kind: 'string',
      fieldId: CatalogueFilterFieldId.ManufacturerName,
      operator: op,
      value: trimmed,
    },
  };
}
