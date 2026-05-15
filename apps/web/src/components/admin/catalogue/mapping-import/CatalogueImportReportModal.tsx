'use client';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { Supplier } from '@vetply/shared';
import type {
  CatalogueProductsImportRunResult,
  SupplierListingsMappingImportRunResult,
} from '@/utils/catalogue-mapping-import-runners';
import { CatalogueProductsImportReportBody } from './CatalogueProductsImportReportBody';
import { SupplierListingsMappingImportReportBody } from './SupplierListingsMappingImportReportBody';

export type CatalogueImportReportModalState =
  | { kind: 'products'; result: CatalogueProductsImportRunResult }
  | {
      kind: 'listings';
      supplier: Supplier;
      result: SupplierListingsMappingImportRunResult;
    };

export type CatalogueImportReportModalProps = {
  open: boolean;
  onClose: () => void;
  state: CatalogueImportReportModalState | null;
};

export function CatalogueImportReportModal({
  open,
  onClose,
  state,
}: CatalogueImportReportModalProps) {
  const title =
    state?.kind === 'products'
      ? 'Catalogue products import'
      : state?.kind === 'listings'
        ? 'Supplier listings import'
        : 'Import report';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description="Review the outcome of your import below."
      maxWidth="lg"
      panelClassName="max-w-3xl"
      footer={
        <Button type="button" variant="primary" onClick={onClose}>
          OK
        </Button>
      }
    >
      {state?.kind === 'products' ? (
        <CatalogueProductsImportReportBody result={state.result} />
      ) : state?.kind === 'listings' ? (
        <SupplierListingsMappingImportReportBody
          supplier={state.supplier}
          result={state.result}
        />
      ) : null}
    </Modal>
  );
}
