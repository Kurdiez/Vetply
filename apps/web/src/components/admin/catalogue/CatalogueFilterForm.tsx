"use client";

import { FilterEnumTagList } from "@/components/ui/filters/FilterEnumTagList";
import { FilterLabeledSelect } from "@/components/ui/filters/FilterLabeledSelect";
import type { FilterSelectOption } from "@/components/ui/filters/FilterLabeledSelect";
import { FilterStringTagList } from "@/components/ui/filters/FilterStringTagList";
import { FilterTextInput } from "@/components/ui/filters/FilterTextInput";
import { Select } from "@/components/ui/Select";
import { useCallback, useMemo } from "react";
import {
  CatalogueFilterFieldId,
  CatalogueFilterOperator,
  defaultOperatorForField,
  getFieldKind,
  LEGAL_CATEGORY_OPTIONS,
  operatorsForField,
  SALES_CATEGORY_OPTIONS,
} from "./catalogue-filter-model";
import { createEmptyDraft } from "./catalogue-filter-validation";
import { useCatalogueView } from "./CatalogueViewContext";

const FIELD_OPTIONS: FilterSelectOption[] = [
  { value: CatalogueFilterFieldId.Name, label: "Name" },
  {
    value: CatalogueFilterFieldId.ManufacturerName,
    label: "Manufacturer",
  },
  {
    value: CatalogueFilterFieldId.SalesCategory,
    label: "Sales category",
  },
  {
    value: CatalogueFilterFieldId.LegalCategory,
    label: "Legal category",
  },
  { value: CatalogueFilterFieldId.Pom, label: "POM" },
];

const OPERATOR_LABEL: Record<CatalogueFilterOperator, string> = {
  [CatalogueFilterOperator.IsExactly]: "Is exactly",
  [CatalogueFilterOperator.IsDistinctFrom]: "Is distinct from",
  [CatalogueFilterOperator.Contains]: "Contains",
  [CatalogueFilterOperator.DoesNotContain]: "Does not contain",
  [CatalogueFilterOperator.ContainsAnyOf]: "Contains any one of",
  [CatalogueFilterOperator.DoesNotContainAnyOf]: "Does not contain any of",
};

function isStringMultiOp(op: CatalogueFilterOperator | ""): boolean {
  return (
    op === CatalogueFilterOperator.ContainsAnyOf ||
    op === CatalogueFilterOperator.DoesNotContainAnyOf
  );
}

function isEnumMultiOp(op: CatalogueFilterOperator | ""): boolean {
  return (
    op === CatalogueFilterOperator.ContainsAnyOf ||
    op === CatalogueFilterOperator.DoesNotContainAnyOf
  );
}

export function CatalogueFilterForm() {
  const { filterDraft, setFilterDraft } = useCatalogueView();

  const fieldId = filterDraft.fieldId;
  const allowedOps = useMemo(
    () => (fieldId ? operatorsForField(fieldId) : []),
    [fieldId],
  );

  const effectiveOperator = useMemo(() => {
    if (!fieldId) {
      return "";
    }
    if (filterDraft.operator && allowedOps.includes(filterDraft.operator)) {
      return filterDraft.operator;
    }
    return defaultOperatorForField(fieldId);
  }, [fieldId, filterDraft.operator, allowedOps]);

  const operatorOptions: FilterSelectOption[] = useMemo(
    () =>
      allowedOps.map((op) => ({
        value: op,
        label: OPERATOR_LABEL[op] ?? op,
      })),
    [allowedOps],
  );

  const salesEnumOptions: FilterSelectOption[] = useMemo(
    () =>
      SALES_CATEGORY_OPTIONS.map((v) => ({
        value: v,
        label: v,
      })),
    [],
  );

  const legalEnumOptions: FilterSelectOption[] = useMemo(
    () =>
      LEGAL_CATEGORY_OPTIONS.map((v) => ({
        value: v,
        label: v,
      })),
    [],
  );

  const setField = useCallback(
    (value: string) => {
      if (value === "") {
        setFilterDraft(createEmptyDraft());
        return;
      }
      const fid = value as CatalogueFilterFieldId;
      setFilterDraft({
        ...createEmptyDraft(),
        fieldId: fid,
        operator: defaultOperatorForField(fid),
      });
    },
    [setFilterDraft],
  );

  const setOperator = useCallback(
    (operator: string) => {
      setFilterDraft((d) => ({
        ...d,
        operator: operator as CatalogueFilterOperator | "",
      }));
    },
    [setFilterDraft],
  );

  const kind = fieldId ? getFieldKind(fieldId) : null;

  const operandSection = useMemo(() => {
    if (!fieldId || !kind) {
      return null;
    }

    if (kind === "string") {
      if (isStringMultiOp(effectiveOperator)) {
        return (
          <FilterStringTagList
            id="filter-string-tags"
            label="Values"
            tags={filterDraft.stringTags}
            onAdd={(tag) => {
              const t = tag.trim();
              if (t.length === 0) {
                return;
              }
              setFilterDraft((d) =>
                d.stringTags.includes(t)
                  ? d
                  : { ...d, stringTags: [...d.stringTags, t] },
              );
            }}
            onRemove={(index) => {
              setFilterDraft((d) => ({
                ...d,
                stringTags: d.stringTags.filter((_, i) => i !== index),
              }));
            }}
          />
        );
      }
      return (
        <FilterTextInput
          id="filter-string-single"
          label="Value"
          value={filterDraft.stringSingle}
          onChange={(v) =>
            setFilterDraft((d) => ({ ...d, stringSingle: v }))
          }
        />
      );
    }

    if (kind === "enum") {
      if (fieldId === CatalogueFilterFieldId.SalesCategory) {
        if (isEnumMultiOp(effectiveOperator)) {
          return (
            <FilterEnumTagList
              id="filter-sales-hint"
              label="Values"
              addControlId="filter-sales-add"
              options={salesEnumOptions}
              selected={filterDraft.salesCategoryTags}
              onAdd={(value) => {
                setFilterDraft((d) =>
                  d.salesCategoryTags.includes(value as never)
                    ? d
                    : {
                        ...d,
                        salesCategoryTags: [
                          ...d.salesCategoryTags,
                          value as (typeof d.salesCategoryTags)[number],
                        ],
                      },
                );
              }}
              onRemove={(index) => {
                setFilterDraft((d) => ({
                  ...d,
                  salesCategoryTags: d.salesCategoryTags.filter(
                    (_, i) => i !== index,
                  ),
                }));
              }}
            />
          );
        }
        return (
          <div>
            <label
              htmlFor="filter-sales-single"
              className="block text-sm/6 font-medium text-white"
            >
              Value
            </label>
            <div className="mt-2">
              <Select
                id="filter-sales-single"
                value={filterDraft.salesCategorySingle}
                onChange={(e) =>
                  setFilterDraft((d) => ({
                    ...d,
                    salesCategorySingle: e.target.value as never,
                  }))
                }
              >
                <option value="">Select value…</option>
                {SALES_CATEGORY_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        );
      }
      if (fieldId === CatalogueFilterFieldId.LegalCategory) {
        if (isEnumMultiOp(effectiveOperator)) {
          return (
            <FilterEnumTagList
              id="filter-legal-hint"
              label="Values"
              addControlId="filter-legal-add"
              options={legalEnumOptions}
              selected={filterDraft.legalCategoryTags}
              onAdd={(value) => {
                setFilterDraft((d) =>
                  d.legalCategoryTags.includes(value as never)
                    ? d
                    : {
                        ...d,
                        legalCategoryTags: [
                          ...d.legalCategoryTags,
                          value as (typeof d.legalCategoryTags)[number],
                        ],
                      },
                );
              }}
              onRemove={(index) => {
                setFilterDraft((d) => ({
                  ...d,
                  legalCategoryTags: d.legalCategoryTags.filter(
                    (_, i) => i !== index,
                  ),
                }));
              }}
            />
          );
        }
        return (
          <div>
            <label
              htmlFor="filter-legal-single"
              className="block text-sm/6 font-medium text-white"
            >
              Value
            </label>
            <div className="mt-2">
              <Select
                id="filter-legal-single"
                value={filterDraft.legalCategorySingle}
                onChange={(e) =>
                  setFilterDraft((d) => ({
                    ...d,
                    legalCategorySingle: e.target.value as never,
                  }))
                }
              >
                <option value="">Select value…</option>
                {LEGAL_CATEGORY_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        );
      }
    }

    if (kind === "boolean") {
      return (
        <div>
          <label
            htmlFor="filter-pom"
            className="block text-sm/6 font-medium text-white"
          >
            Value
          </label>
          <div className="mt-2">
            <Select
              id="filter-pom"
              value={
                filterDraft.pomValue === null
                  ? ""
                  : filterDraft.pomValue
                    ? "true"
                    : "false"
              }
              onChange={(e) => {
                const v = e.target.value;
                setFilterDraft((d) => ({
                  ...d,
                  pomValue: v === "" ? null : v === "true",
                }));
              }}
            >
              <option value="">Select…</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </Select>
          </div>
        </div>
      );
    }

    return null;
  }, [
    fieldId,
    kind,
    effectiveOperator,
    filterDraft,
    salesEnumOptions,
    legalEnumOptions,
    setFilterDraft,
  ]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FilterLabeledSelect
          id="catalogue-filter-field"
          label="Field"
          value={fieldId}
          onChange={setField}
          options={[{ value: "", label: "Select field…" }, ...FIELD_OPTIONS]}
        />
        <FilterLabeledSelect
          id="catalogue-filter-operator"
          label="Operator"
          value={effectiveOperator}
          onChange={setOperator}
          options={
            fieldId
              ? operatorOptions
              : [{ value: "", label: "Select field first…" }]
          }
          disabled={!fieldId}
        />
      </div>
      {operandSection}
    </div>
  );
}
