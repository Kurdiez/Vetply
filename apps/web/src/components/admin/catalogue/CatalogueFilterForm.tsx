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
  SUPPLIER_OPTIONS,
  defaultOperatorForField,
  getFieldKind,
  operatorsForField,
} from "./catalogue-filter-model";
import { createEmptyDraft } from "./catalogue-filter-validation";
import { useCatalogueView } from "./CatalogueViewContext";

const FIELD_OPTIONS: FilterSelectOption[] = [
  {
    value: CatalogueFilterFieldId.ManufacturerName,
    label: "Manufacturer",
  },
  {
    value: CatalogueFilterFieldId.Supplier,
    label: "Supplier",
  },
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

  const supplierEnumOptions: FilterSelectOption[] = useMemo(
    () =>
      SUPPLIER_OPTIONS.map((v) => ({
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

    if (fieldId === CatalogueFilterFieldId.Supplier) {
      if (isStringMultiOp(effectiveOperator)) {
        return (
          <FilterEnumTagList
            id="filter-supplier-hint"
            label="Suppliers"
            addControlId="filter-supplier-add"
            options={supplierEnumOptions}
            selected={filterDraft.supplierTags}
            onAdd={(value) => {
              setFilterDraft((d) =>
                d.supplierTags.includes(value as never)
                  ? d
                  : {
                      ...d,
                      supplierTags: [
                        ...d.supplierTags,
                        value as (typeof d.supplierTags)[number],
                      ],
                    },
              );
            }}
            onRemove={(index) => {
              setFilterDraft((d) => ({
                ...d,
                supplierTags: d.supplierTags.filter((_, i) => i !== index),
              }));
            }}
          />
        );
      }
      return (
        <div>
          <label
            htmlFor="filter-supplier-single"
            className="block text-sm/6 font-medium text-white"
          >
            Supplier
          </label>
          <div className="mt-2">
            <Select
              id="filter-supplier-single"
              value={filterDraft.supplierSingle}
              onChange={(e) =>
                setFilterDraft((d) => ({
                  ...d,
                  supplierSingle: e.target.value as never,
                }))
              }
            >
              <option value="">Select supplier…</option>
              {SUPPLIER_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
        </div>
      );
    }

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
  }, [
    fieldId,
    kind,
    effectiveOperator,
    filterDraft,
    supplierEnumOptions,
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
