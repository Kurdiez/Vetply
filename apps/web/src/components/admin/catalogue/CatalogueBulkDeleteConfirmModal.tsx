'use client';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useCallback, useState } from 'react';

type CatalogueBulkDeleteConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  selectedCount: number;
  onConfirmDelete: () => Promise<boolean>;
};

export function CatalogueBulkDeleteConfirmModal({
  open,
  onClose,
  selectedCount,
  onConfirmDelete,
}: CatalogueBulkDeleteConfirmModalProps) {
  const [pending, setPending] = useState(false);

  const handleConfirm = useCallback(async () => {
    setPending(true);
    try {
      const ok = await onConfirmDelete();
      if (ok) {
        onClose();
      }
    } finally {
      setPending(false);
    }
  }, [onConfirmDelete, onClose]);

  const handleDialogClose = useCallback(() => {
    if (pending) {
      return;
    }
    onClose();
  }, [pending, onClose]);

  const noun = selectedCount === 1 ? 'catalogue product' : 'catalogue products';
  const bodyText =
    selectedCount === 1
      ? 'This removes the catalogue product you selected. Its supplier listings are not deleted; they are orphaned without being linked to a catalogue product.'
      : 'This removes the catalogue products you selected. Their supplier listings are not deleted; they are orphaned without being linked to a catalogue product';

  return (
    <Modal
      open={open}
      onClose={handleDialogClose}
      variant="danger"
      title={`Delete selected ${noun}?`}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={pending}
            onClick={() => void handleConfirm()}
          >
            Delete
          </Button>
        </>
      }
    >
      <p className="mt-3 text-sm text-gray-300">{bodyText}</p>
    </Modal>
  );
}
