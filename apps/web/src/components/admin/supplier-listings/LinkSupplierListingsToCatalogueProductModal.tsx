'use client';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';
import {
  CatalogUnitType,
  LegalCategory,
  type CatalogueProductPickerItem,
  type CatalogueProductPickerQueryInput,
  type CatalogueProductPickerListRes,
} from '@vetply/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const legalOptions = Object.values(LegalCategory).sort((a, b) =>
  a.localeCompare(b, undefined, { sensitivity: 'base' }),
);
const unitTypeOptions = Object.values(CatalogUnitType).sort((a, b) =>
  a.localeCompare(b, undefined, { sensitivity: 'base' }),
);

type PickerLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export type LinkSupplierListingsToCatalogueProductModalProps = {
  open: boolean;
  onClose: () => void;
  searchCatalogueProductsForPicker: (
    params: Partial<CatalogueProductPickerQueryInput>,
  ) => Promise<CatalogueProductPickerListRes>;
  linkSelectedListingsToProduct: (productId: string) => Promise<boolean>;
  selectedListingCount: number;
};

export function LinkSupplierListingsToCatalogueProductModal({
  open,
  onClose,
  searchCatalogueProductsForPicker,
  linkSelectedListingsToProduct,
  selectedListingCount,
}: LinkSupplierListingsToCatalogueProductModalProps) {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [legalCategory, setLegalCategory] = useState('');
  const [unitType, setUnitType] = useState('');
  const [unitQuantity, setUnitQuantity] = useState('');
  const [pickerItems, setPickerItems] = useState<CatalogueProductPickerItem[]>(
    [],
  );
  const [pickerStatus, setPickerStatus] = useState<PickerLoadStatus>('idle');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [linkSubmitting, setLinkSubmitting] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setSearchInput('');
    setDebouncedSearch('');
    setLegalCategory('');
    setUnitType('');
    setUnitQuantity('');
    setPickerItems([]);
    setPickerStatus('idle');
    setSelectedProductId(null);
  }, [open]);

  const hasPickerCriteria = useMemo(() => {
    const uq = unitQuantity.trim();
    return (
      debouncedSearch.length > 0 ||
      legalCategory !== '' ||
      unitType !== '' ||
      uq.length > 0
    );
  }, [debouncedSearch, legalCategory, unitType, unitQuantity]);

  useEffect(() => {
    if (!open || !hasPickerCriteria) {
      if (open && !hasPickerCriteria) {
        setPickerItems([]);
        setPickerStatus('idle');
      }
      return;
    }

    let cancelled = false;
    setPickerStatus('loading');

    void searchCatalogueProductsForPicker({
      q: debouncedSearch || undefined,
      legalCategory:
        legalCategory === '' ? undefined : (legalCategory as LegalCategory),
      unitType: unitType === '' ? undefined : (unitType as CatalogUnitType),
      unitQuantity:
        unitQuantity.trim() === '' ? undefined : unitQuantity.trim(),
    })
      .then((res) => {
        if (!cancelled) {
          setPickerItems(res.items);
          setPickerStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPickerStatus('error');
          toast.error('Could not search catalogue products.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    open,
    hasPickerCriteria,
    debouncedSearch,
    legalCategory,
    unitType,
    unitQuantity,
    searchCatalogueProductsForPicker,
  ]);

  useEffect(() => {
    setSelectedProductId((prev) =>
      prev && pickerItems.some((i) => i.id === prev) ? prev : null,
    );
  }, [pickerItems]);

  const onSubmitLink = useCallback(async () => {
    if (!selectedProductId) {
      return;
    }
    setLinkSubmitting(true);
    const ok = await linkSelectedListingsToProduct(selectedProductId);
    setLinkSubmitting(false);
    if (ok) {
      onClose();
    }
  }, [selectedProductId, linkSelectedListingsToProduct, onClose]);

  const linkDisabled =
    !selectedProductId ||
    selectedListingCount === 0 ||
    linkSubmitting ||
    pickerStatus === 'loading';

  const emptyHint = !hasPickerCriteria ? (
    <p className="text-sm text-gray-400">
      Enter a search or choose filters to see catalogue products (up to three
      matches).
    </p>
  ) : pickerStatus === 'loading' ? (
    <p className="text-sm text-gray-400">Searching…</p>
  ) : pickerStatus === 'error' ? (
    <p className="text-sm text-danger-400">Search failed. Try again.</p>
  ) : pickerItems.length === 0 ? (
    <p className="text-sm text-gray-400">No matching catalogue products.</p>
  ) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Link catalogue product"
      description={`Choose one catalogue product for the ${selectedListingCount} selected listing${selectedListingCount === 1 ? '' : 's'}.`}
      maxWidth="lg"
      panelClassName="max-h-[min(90vh,720px)]"
      footer={
        <div className="flex w-full flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={linkDisabled}
            onClick={() => void onSubmitLink()}
          >
            {linkSubmitting ? 'Linking…' : 'Link'}
          </Button>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-gray-300">Search name</span>
            <TextInput
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Product name contains…"
              autoComplete="off"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-300">Legal category</span>
            <Select
              value={legalCategory}
              onChange={(e) => setLegalCategory(e.target.value)}
            >
              <option value="">Any</option>
              {legalOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-300">Unit quantity</span>
            <TextInput
              value={unitQuantity}
              onChange={(e) => setUnitQuantity(e.target.value)}
              placeholder="Exact match"
              autoComplete="off"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-300">Unit type</span>
            <Select
              value={unitType}
              onChange={(e) => setUnitType(e.target.value)}
            >
              <option value="">Any</option>
              {unitTypeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
          </label>
        </div>

        {emptyHint}

        {pickerItems.length > 0 && (
          <div className="space-y-2">
            <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
              {pickerItems.map((item) => (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-white/5">
                    <input
                      type="radio"
                      name="catalogue-picker-product"
                      className="mt-1.5 shrink-0"
                      checked={selectedProductId === item.id}
                      onChange={() => setSelectedProductId(item.id)}
                    />
                    {item.image ? (
                      <img
                        src={item.image}
                        alt=""
                        className="size-10 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="size-10 shrink-0 rounded bg-gray-700" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-medium text-white">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {[item.manufacturerName, item.legalCategory]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.unitType} · {item.unitQuantity}
                      </p>
                    </div>
                  </label>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500">
              Only the top 3 matching results are shown.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
