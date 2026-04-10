"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { Button } from "@/components/ui/Button";
import { useCallback, useEffect } from "react";
import { createEmptyDraft } from "./catalogue-filter-validation";
import { CatalogueFilterForm } from "./CatalogueFilterForm";
import { useCatalogueView } from "./CatalogueViewContext";

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
    <Dialog open={open} onClose={handleClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-900/80 transition-opacity duration-200 ease-out data-closed:opacity-0"
      />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel
          transition
          className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-lg bg-gray-800 p-6 shadow-xl ring-1 ring-white/10 transition duration-200 ease-out data-closed:scale-95 data-closed:opacity-0"
        >
          <DialogTitle className="text-base font-semibold text-white">
            Add filter
          </DialogTitle>
          <p className="mt-2 text-sm text-gray-400">
            Each new filter is combined with AND. Multiple values in one filter use
            OR.
          </p>
          <div className="mt-6">
            <CatalogueFilterForm />
          </div>
          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleAdd}>
              Add
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
