'use client';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useCallback, useEffect } from 'react';
import { createEmptyDraft } from './catalogue-filter-validation';
import { CatalogueFilterForm } from './CatalogueFilterForm';
import { useCatalogueView } from './CatalogueViewContext';

export type CatalogueAddFilterModalProps = {
  open: boolean;
  onClose: () => void;
};

export function CatalogueAddFilterModal({
  open,
  onClose,
}: CatalogueAddFilterModalProps) {
  const { addFilter, setFilterDraft } = useCatalogueView();

  useEffect(() => {
    if (open) {
      setFilterDraft(createEmptyDraft());
    }
  }, [open, setFilterDraft]);

  const handleClose = useCallback(() => {
    setFilterDraft(createEmptyDraft());
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
        <CatalogueFilterForm />
      </div>
    </Modal>
  );
}
