'use client';

import { IconTextButton } from '@/components/ui/IconTextButton';
import { TrashIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { CatalogueBulkDeleteConfirmModal } from './CatalogueBulkDeleteConfirmModal';

export type CatalogueSelectionSummaryProps = {
  selectedProductCount: number;
  clearProductSelection: () => void;
  bulkDeleteConfirmOpen: boolean;
  openBulkDeleteConfirm: () => void;
  closeBulkDeleteConfirm: () => void;
  confirmBulkDelete: () => Promise<boolean>;
};

export function CatalogueSelectionSummary({
  selectedProductCount,
  clearProductSelection,
  bulkDeleteConfirmOpen,
  openBulkDeleteConfirm,
  closeBulkDeleteConfirm,
  confirmBulkDelete,
}: CatalogueSelectionSummaryProps) {
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
            onClick={openBulkDeleteConfirm}
          >
            Delete
          </IconTextButton>
        </div>
      </div>
      <CatalogueBulkDeleteConfirmModal
        open={bulkDeleteConfirmOpen}
        onClose={closeBulkDeleteConfirm}
        selectedCount={selectedProductCount}
        onConfirmDelete={confirmBulkDelete}
      />
    </>
  );
}
