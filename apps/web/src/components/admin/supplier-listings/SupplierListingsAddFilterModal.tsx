'use client';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useCallback, useEffect } from 'react';
import { createEmptySupplierListingsDraft } from './supplier-listing-filter-validation';
import { SupplierListingsFilterForm } from './SupplierListingsFilterForm';
import { useSupplierListingsView } from './SupplierListingsViewContext';

export type SupplierListingsAddFilterModalProps = {
  open: boolean;
  onClose: () => void;
};

export function SupplierListingsAddFilterModal({
  open,
  onClose,
}: SupplierListingsAddFilterModalProps) {
  const { addFilter, setFilterDraft } = useSupplierListingsView();

  useEffect(() => {
    if (open) {
      setFilterDraft(createEmptySupplierListingsDraft());
    }
  }, [open, setFilterDraft]);

  const handleClose = useCallback(() => {
    setFilterDraft(createEmptySupplierListingsDraft());
    onClose();
  }, [onClose, setFilterDraft]);

  const handleAdd = useCallback(() => {
    if (addFilter()) {
      onClose();
    }
  }, [addFilter, onClose]);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      variant="normal"
      maxWidth="lg"
      title="Add filter"
      description="Each new filter is combined with AND. Multiple values in one filter use OR."
      footer={
        <>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleAdd}>
            Add
          </Button>
        </>
      }
    >
      <div className="mt-6">
        <SupplierListingsFilterForm />
      </div>
    </Modal>
  );
}
