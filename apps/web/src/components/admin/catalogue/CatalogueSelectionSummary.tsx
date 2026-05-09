'use client';

import { IconTextButton } from '@/components/ui/IconTextButton';
import { TrashIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { useCallback, useState } from 'react';
import { CatalogueBulkDeleteConfirmModal } from './CatalogueBulkDeleteConfirmModal';
import { useCatalogueView } from './CatalogueViewContext';

export function CatalogueSelectionSummary() {
  const {
    selectedProductCount,
    clearProductSelection,
    bulkDeleteSelectedProducts,
  } = useCatalogueView();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const openDeleteConfirm = useCallback(() => {
    setDeleteConfirmOpen(true);
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    setDeleteConfirmOpen(false);
  }, []);

  if (selectedProductCount === 0) {
    return null;
  }

  const noun = selectedProductCount === 1 ? 'product' : 'products';

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-gray-800/50 px-4 py-3">
        <p className="text-sm text-gray-300">
          <span className="font-semibold text-white">
            {selectedProductCount}
          </span>{' '}
          {noun} selected
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <IconTextButton
            variant="primary"
            icon={<XMarkIcon />}
            onClick={clearProductSelection}
          >
            Clear
          </IconTextButton>
          <IconTextButton
            variant="red"
            icon={<TrashIcon />}
            onClick={openDeleteConfirm}
          >
            Delete
          </IconTextButton>
        </div>
      </div>
      <CatalogueBulkDeleteConfirmModal
        open={deleteConfirmOpen}
        onClose={closeDeleteConfirm}
        selectedCount={selectedProductCount}
        onConfirmDelete={bulkDeleteSelectedProducts}
      />
    </>
  );
}
