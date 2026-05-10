'use client';

import { IconTextButton } from '@/components/ui/IconTextButton';
import { LinkIcon, LinkSlashIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { useSupplierListingsView } from './SupplierListingsViewContext';

export function SupplierListingsSelectionSummary({
  onOpenLinkModal,
}: {
  onOpenLinkModal: () => void;
}) {
  const {
    selectedListingCount,
    clearListingSelection,
    unlinkSelectedListingsFromCatalogueProduct,
  } = useSupplierListingsView();

  if (selectedListingCount === 0) {
    return null;
  }

  const noun = selectedListingCount === 1 ? 'listing' : 'listings';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-gray-800/50 px-4 py-3">
      <p className="text-sm text-gray-300">
        <span className="font-semibold text-white">{selectedListingCount}</span>{' '}
        {noun} selected
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <IconTextButton
          variant="primary"
          icon={<XMarkIcon />}
          onClick={clearListingSelection}
        >
          Clear
        </IconTextButton>
        <IconTextButton
          variant="primary"
          icon={<LinkIcon />}
          onClick={onOpenLinkModal}
        >
          Link catalogue product
        </IconTextButton>
        <IconTextButton
          variant="red"
          icon={<LinkSlashIcon />}
          onClick={() => void unlinkSelectedListingsFromCatalogueProduct()}
        >
          Unlink catalogue product
        </IconTextButton>
      </div>
    </div>
  );
}
