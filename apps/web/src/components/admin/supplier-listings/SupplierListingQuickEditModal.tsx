'use client';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import {
  formatProductCategoryPathDisplay,
  listProductCategoryLeafRefs,
  type CatalogueSupplierListingListItem,
} from '@vetply/shared';
import { useEffect, useMemo, useState } from 'react';

const PRODUCT_CATEGORY_LEAF_OPTIONS = listProductCategoryLeafRefs()
  .map((leaf) => ({
    path: leaf.path,
    label: formatProductCategoryPathDisplay(leaf.path),
  }))
  .sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
  );

export type SupplierListingQuickEditModalProps = {
  open: boolean;
  listing: CatalogueSupplierListingListItem | null;
  onClose: () => void;
  saveProductCategory: (
    listingId: string,
    productCategory: string,
  ) => Promise<boolean>;
};

export function SupplierListingQuickEditModal({
  open,
  listing,
  onClose,
  saveProductCategory,
}: SupplierListingQuickEditModalProps) {
  const [productCategory, setProductCategory] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || listing == null) {
      return;
    }
    setProductCategory(listing.productCategory ?? '');
  }, [open, listing]);

  const title = useMemo(() => {
    if (listing == null) {
      return 'Quick edit';
    }
    return `Quick edit · ${listing.name}`;
  }, [listing]);

  async function onSave(): Promise<void> {
    if (listing == null || productCategory.trim() === '') {
      return;
    }
    setSaving(true);
    try {
      const ok = await saveProductCategory(listing.id, productCategory);
      if (ok) {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="md"
      footer={
        listing == null ? null : (
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void onSave()}
              disabled={saving || productCategory.trim() === ''}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        )
      }
    >
      {listing == null ? null : (
        <div className="space-y-4">
          <dl className="grid gap-2 text-sm text-gray-300">
            <div>
              <dt className="text-gray-500">Supplier</dt>
              <dd className="text-gray-100">{listing.supplierName}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Supplier product ID</dt>
              <dd className="text-gray-100">{listing.supplierProductId}</dd>
            </div>
          </dl>

          <div>
            <label
              htmlFor="supplier-listing-quick-edit-category"
              className="block text-sm/6 font-medium text-white"
            >
              Category
            </label>
            <div className="mt-2">
              <Select
                id="supplier-listing-quick-edit-category"
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
              >
                <option value="">Select category…</option>
                {PRODUCT_CATEGORY_LEAF_OPTIONS.map((option) => (
                  <option key={option.path} value={option.path}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Saving marks this listing as admin mapped.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
