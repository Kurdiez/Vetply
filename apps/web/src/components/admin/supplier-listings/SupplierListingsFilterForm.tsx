'use client';

import type { FilterSelectOption } from '@/components/ui/filters/FilterLabeledSelect';
import { FilterLabeledSelect } from '@/components/ui/filters/FilterLabeledSelect';
import { FilterStringTagList } from '@/components/ui/filters/FilterStringTagList';
import { FilterTextInput } from '@/components/ui/filters/FilterTextInput';
import { Select } from '@/components/ui/Select';
import {
  SupplierListingFilterFieldId,
  SupplierListingPriceOperator,
  SupplierListingStringOperator,
  SupplierListingSupplierOperator,
} from '@vetply/shared';
import { useCallback, useMemo } from 'react';
import { SUPPLIER_OPTIONS } from './supplier-listing-filter-model';
import {
  CATALOG_PRODUCT_FILTER_NOT_LINKED_OPERATOR,
  createEmptySupplierListingsDraft,
} from './supplier-listing-filter-validation';
import { useSupplierListingsView } from './SupplierListingsViewContext';

const FIELD_OPTIONS: FilterSelectOption[] = [
  { value: SupplierListingFilterFieldId.Supplier, label: 'Supplier' },
  {
    value: SupplierListingFilterFieldId.SupplierProductId,
    label: 'Supplier product ID',
  },
  { value: SupplierListingFilterFieldId.ListedPrice, label: 'Price' },
  {
    value: SupplierListingFilterFieldId.CatalogProductName,
    label: 'Catalogue product',
  },
];

const STRING_OP_LABEL: Record<SupplierListingStringOperator, string> = {
  [SupplierListingStringOperator.IsExactly]: 'Is exactly',
  [SupplierListingStringOperator.IsDistinctFrom]: 'Is distinct from',
  [SupplierListingStringOperator.Contains]: 'Contains',
  [SupplierListingStringOperator.DoesNotContain]: 'Does not contain',
  [SupplierListingStringOperator.ContainsAnyOf]: 'Contains any one of',
  [SupplierListingStringOperator.DoesNotContainAnyOf]:
    'Does not contain any of',
};

const SUPPLIER_OP_LABEL: Record<SupplierListingSupplierOperator, string> = {
  [SupplierListingSupplierOperator.IsExactly]: 'Is exactly',
  [SupplierListingSupplierOperator.IsDistinctFrom]: 'Is distinct from',
};

const PRICE_OP_LABEL: Record<SupplierListingPriceOperator, string> = {
  [SupplierListingPriceOperator.Eq]: '=',
  [SupplierListingPriceOperator.Gt]: '>',
  [SupplierListingPriceOperator.Lt]: '<',
  [SupplierListingPriceOperator.Gte]: '≥',
  [SupplierListingPriceOperator.Lte]: '≤',
};

function isStringMultiOp(
  op:
    | SupplierListingStringOperator
    | typeof CATALOG_PRODUCT_FILTER_NOT_LINKED_OPERATOR
    | '',
): boolean {
  if (op === CATALOG_PRODUCT_FILTER_NOT_LINKED_OPERATOR) {
    return false;
  }
  return (
    op === SupplierListingStringOperator.ContainsAnyOf ||
    op === SupplierListingStringOperator.DoesNotContainAnyOf
  );
}

export function SupplierListingsFilterForm() {
  const { filterDraft, setFilterDraft } = useSupplierListingsView();

  const fieldId = filterDraft.fieldId;

  const setField = useCallback(
    (value: string) => {
      if (value === '') {
        setFilterDraft(createEmptySupplierListingsDraft());
        return;
      }
      const fid = value as SupplierListingFilterFieldId;
      const base = createEmptySupplierListingsDraft();
      if (fid === SupplierListingFilterFieldId.Supplier) {
        setFilterDraft({
          ...base,
          fieldId: fid,
          supplierOperator: SupplierListingSupplierOperator.IsExactly,
        });
        return;
      }
      if (fid === SupplierListingFilterFieldId.ListedPrice) {
        setFilterDraft({
          ...base,
          fieldId: fid,
          priceOperator: SupplierListingPriceOperator.Eq,
        });
        return;
      }
      setFilterDraft({
        ...base,
        fieldId: fid,
        stringOperator: SupplierListingStringOperator.Contains,
      });
    },
    [setFilterDraft],
  );

  const stringOps = useMemo(
    () => Object.values(SupplierListingStringOperator),
    [],
  );
  const supplierOps = useMemo(
    () => Object.values(SupplierListingSupplierOperator),
    [],
  );
  const priceOps = useMemo(
    () => Object.values(SupplierListingPriceOperator),
    [],
  );

  const effectiveStringOperator = useMemo(() => {
    if (
      fieldId !== SupplierListingFilterFieldId.SupplierProductId &&
      fieldId !== SupplierListingFilterFieldId.CatalogProductName
    ) {
      return '';
    }
    const op = filterDraft.stringOperator;
    if (
      fieldId === SupplierListingFilterFieldId.CatalogProductName &&
      op === CATALOG_PRODUCT_FILTER_NOT_LINKED_OPERATOR
    ) {
      return CATALOG_PRODUCT_FILTER_NOT_LINKED_OPERATOR;
    }
    if (op && stringOps.includes(op as SupplierListingStringOperator)) {
      return op as SupplierListingStringOperator;
    }
    return SupplierListingStringOperator.Contains;
  }, [fieldId, filterDraft.stringOperator, stringOps]);

  const effectiveSupplierOperator = useMemo(() => {
    if (fieldId !== SupplierListingFilterFieldId.Supplier) {
      return '';
    }
    const op = filterDraft.supplierOperator;
    if (op && supplierOps.includes(op)) {
      return op;
    }
    return SupplierListingSupplierOperator.IsExactly;
  }, [fieldId, filterDraft.supplierOperator, supplierOps]);

  const effectivePriceOperator = useMemo(() => {
    if (fieldId !== SupplierListingFilterFieldId.ListedPrice) {
      return '';
    }
    const op = filterDraft.priceOperator;
    if (op && priceOps.includes(op)) {
      return op;
    }
    return SupplierListingPriceOperator.Eq;
  }, [fieldId, filterDraft.priceOperator, priceOps]);

  const stringOperatorOptions: FilterSelectOption[] = useMemo(() => {
    const base = stringOps.map((op) => ({
      value: op,
      label: STRING_OP_LABEL[op] ?? op,
    }));
    if (fieldId === SupplierListingFilterFieldId.CatalogProductName) {
      return [
        ...base,
        {
          value: CATALOG_PRODUCT_FILTER_NOT_LINKED_OPERATOR,
          label: 'Is not linked',
        },
      ];
    }
    return base;
  }, [fieldId, stringOps]);

  const supplierOperatorOptions: FilterSelectOption[] = useMemo(
    () =>
      supplierOps.map((op) => ({
        value: op,
        label: SUPPLIER_OP_LABEL[op] ?? op,
      })),
    [supplierOps],
  );

  const priceOperatorOptions: FilterSelectOption[] = useMemo(
    () =>
      priceOps.map((op) => ({
        value: op,
        label: PRICE_OP_LABEL[op] ?? op,
      })),
    [priceOps],
  );

  const operandSection = useMemo(() => {
    if (fieldId === SupplierListingFilterFieldId.Supplier) {
      return (
        <div>
          <label
            htmlFor="supplier-filter-supplier-value"
            className="block text-sm/6 font-medium text-white"
          >
            Supplier
          </label>
          <div className="mt-2">
            <Select
              id="supplier-filter-supplier-value"
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

    if (fieldId === SupplierListingFilterFieldId.ListedPrice) {
      return (
        <FilterTextInput
          id="supplier-filter-price-value"
          label="Price"
          value={filterDraft.priceValue}
          onChange={(v) => setFilterDraft((d) => ({ ...d, priceValue: v }))}
        />
      );
    }

    if (
      fieldId === SupplierListingFilterFieldId.SupplierProductId ||
      fieldId === SupplierListingFilterFieldId.CatalogProductName
    ) {
      if (
        fieldId === SupplierListingFilterFieldId.CatalogProductName &&
        effectiveStringOperator === CATALOG_PRODUCT_FILTER_NOT_LINKED_OPERATOR
      ) {
        return null;
      }
      if (isStringMultiOp(effectiveStringOperator)) {
        return (
          <FilterStringTagList
            id="supplier-filter-string-tags"
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
          id="supplier-filter-string-single"
          label="Value"
          value={filterDraft.stringSingle}
          onChange={(v) => setFilterDraft((d) => ({ ...d, stringSingle: v }))}
        />
      );
    }

    return null;
  }, [fieldId, filterDraft, effectiveStringOperator, setFilterDraft]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FilterLabeledSelect
          id="supplier-listing-filter-field"
          label="Field"
          value={fieldId}
          onChange={setField}
          options={[{ value: '', label: 'Select field…' }, ...FIELD_OPTIONS]}
        />
        {fieldId === SupplierListingFilterFieldId.SupplierProductId ||
        fieldId === SupplierListingFilterFieldId.CatalogProductName ? (
          <FilterLabeledSelect
            id="supplier-listing-filter-string-op"
            label="Operator"
            value={effectiveStringOperator}
            onChange={(v) =>
              setFilterDraft((d) => ({
                ...d,
                stringOperator:
                  v === CATALOG_PRODUCT_FILTER_NOT_LINKED_OPERATOR
                    ? CATALOG_PRODUCT_FILTER_NOT_LINKED_OPERATOR
                    : (v as SupplierListingStringOperator),
              }))
            }
            options={stringOperatorOptions}
          />
        ) : fieldId === SupplierListingFilterFieldId.Supplier ? (
          <FilterLabeledSelect
            id="supplier-listing-filter-supplier-op"
            label="Operator"
            value={effectiveSupplierOperator}
            onChange={(v) =>
              setFilterDraft((d) => ({
                ...d,
                supplierOperator: v as SupplierListingSupplierOperator,
              }))
            }
            options={supplierOperatorOptions}
          />
        ) : fieldId === SupplierListingFilterFieldId.ListedPrice ? (
          <FilterLabeledSelect
            id="supplier-listing-filter-price-op"
            label="Operator"
            value={effectivePriceOperator}
            onChange={(v) =>
              setFilterDraft((d) => ({
                ...d,
                priceOperator: v as SupplierListingPriceOperator,
              }))
            }
            options={priceOperatorOptions}
          />
        ) : (
          <FilterLabeledSelect
            id="supplier-listing-filter-operator-placeholder"
            label="Operator"
            value=""
            onChange={() => {}}
            options={[{ value: '', label: '—' }]}
            disabled
          />
        )}
      </div>
      {operandSection}
    </div>
  );
}
