import type { LegalCategory, SalesCategory, Supplier } from "@vetply/shared";
import {
  CatalogueFilterFieldId,
  CatalogueFilterOperator,
} from "@vetply/shared";
import type { AppliedFilter } from "./catalogue-filter-model";
import {
  defaultOperatorForField,
  getFieldKind,
  operatorsForField,
} from "./catalogue-filter-model";

export type CatalogueFilterDraft = {
  fieldId: CatalogueFilterFieldId | "";
  operator: CatalogueFilterOperator | "";
  stringSingle: string;
  stringTags: string[];
  supplierSingle: Supplier | "";
  supplierTags: Supplier[];
  salesCategorySingle: SalesCategory | "";
  salesCategoryTags: SalesCategory[];
  legalCategorySingle: LegalCategory | "";
  legalCategoryTags: LegalCategory[];
  pomValue: boolean | null;
};

export function createEmptyDraft(): CatalogueFilterDraft {
  return {
    fieldId: "",
    operator: "",
    stringSingle: "",
    stringTags: [],
    supplierSingle: "",
    supplierTags: [],
    salesCategorySingle: "",
    salesCategoryTags: [],
    legalCategorySingle: "",
    legalCategoryTags: [],
    pomValue: null,
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

function isEnumMultiOperator(op: CatalogueFilterOperator): boolean {
  return (
    op === CatalogueFilterOperator.ContainsAnyOf ||
    op === CatalogueFilterOperator.DoesNotContainAnyOf
  );
}

export function validateDraftAndBuildFilter(
  draft: CatalogueFilterDraft,
  newId: () => string,
): { ok: true; filter: AppliedFilter } | { ok: false; message: string } {
  if (draft.fieldId === "") {
    return { ok: false, message: "Select a field." };
  }

  const fieldId = draft.fieldId;
  const kind = getFieldKind(fieldId);
  const allowed = operatorsForField(fieldId);
  const op: CatalogueFilterOperator =
    draft.operator && allowed.includes(draft.operator)
      ? draft.operator
      : defaultOperatorForField(fieldId);

  if (!allowed.includes(op)) {
    return { ok: false, message: "Select an operator." };
  }

  if (kind === "string") {
    if (fieldId === CatalogueFilterFieldId.Supplier) {
      if (isStringMultiOperator(op)) {
        const tags = draft.supplierTags;
        if (tags.length === 0) {
          return {
            ok: false,
            message: "Select at least one supplier.",
          };
        }
        return {
          ok: true,
          filter: {
            id: newId(),
            kind: "string",
            fieldId: CatalogueFilterFieldId.Supplier,
            operator: op,
            value: tags,
          },
        };
      }
      if (draft.supplierSingle === "") {
        return { ok: false, message: "Select a supplier." };
      }
      return {
        ok: true,
        filter: {
          id: newId(),
          kind: "string",
          fieldId: CatalogueFilterFieldId.Supplier,
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
          message: "Add at least one value for this operator.",
        };
      }
      return {
        ok: true,
        filter: {
          id: newId(),
          kind: "string",
          fieldId: CatalogueFilterFieldId.ManufacturerName,
          operator: op,
          value: tags,
        },
      };
    }
    const trimmed = draft.stringSingle.trim();
    if (trimmed.length === 0) {
      return { ok: false, message: "Enter a value." };
    }
    return {
      ok: true,
      filter: {
        id: newId(),
        kind: "string",
        fieldId: CatalogueFilterFieldId.ManufacturerName,
        operator: op,
        value: trimmed,
      },
    };
  }

  if (kind === "enum") {
    if (fieldId === CatalogueFilterFieldId.SalesCategory) {
      if (isEnumMultiOperator(op)) {
        const tags = draft.salesCategoryTags;
        if (tags.length === 0) {
          return {
            ok: false,
            message: "Add at least one category value.",
          };
        }
        return {
          ok: true,
          filter: {
            id: newId(),
            kind: "enum",
            fieldId: CatalogueFilterFieldId.SalesCategory,
            operator: op,
            value: tags,
          },
        };
      }
      if (draft.salesCategorySingle === "") {
        return { ok: false, message: "Select a sales category." };
      }
      return {
        ok: true,
        filter: {
          id: newId(),
          kind: "enum",
          fieldId: CatalogueFilterFieldId.SalesCategory,
          operator: op,
          value: draft.salesCategorySingle,
        },
      };
    }
    if (fieldId === CatalogueFilterFieldId.LegalCategory) {
      if (isEnumMultiOperator(op)) {
        const tags = draft.legalCategoryTags;
        if (tags.length === 0) {
          return {
            ok: false,
            message: "Add at least one legal category value.",
          };
        }
        return {
          ok: true,
          filter: {
            id: newId(),
            kind: "enum",
            fieldId: CatalogueFilterFieldId.LegalCategory,
            operator: op,
            value: tags,
          },
        };
      }
      if (draft.legalCategorySingle === "") {
        return { ok: false, message: "Select a legal category." };
      }
      return {
        ok: true,
        filter: {
          id: newId(),
          kind: "enum",
          fieldId: CatalogueFilterFieldId.LegalCategory,
          operator: op,
          value: draft.legalCategorySingle,
        },
      };
    }
  }

  if (kind === "boolean") {
    if (draft.pomValue === null) {
      return { ok: false, message: "Select Yes or No." };
    }
    return {
      ok: true,
      filter: {
        id: newId(),
        kind: "boolean",
        fieldId: CatalogueFilterFieldId.Pom,
        operator: op,
        value: draft.pomValue,
      },
    };
  }

  return { ok: false, message: "Invalid filter." };
}
