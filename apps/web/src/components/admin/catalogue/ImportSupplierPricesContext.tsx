'use client';

import {
  countValidNvsAllProductsDataRows,
  runNvsAllProductsBatchedImport,
} from '@/utils/nvs-all-products-batched-import';
import {
  countValidNvsDataRows,
  runNvsCsvBatchedImport,
} from '@/utils/nvs-csv-batched-import';
import {
  countValidVeenakDataRows,
  runVeenakCsvBatchedImport,
} from '@/utils/veenak-csv-batched-import';
import { postCatalogueImportSupplierPricesBatch } from '@/utils/vetply-api/catalogue-api';
import type { CatalogueSupplierImportUploadKind } from '@vetply/shared';
import { NVS_IMPORT_BATCH_MAX, VEENAK_IMPORT_BATCH_MAX } from '@vetply/shared';
import { isAxiosError } from 'axios';
import { useRouter } from 'next/router';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';

export type ImportSupplierPricesContextValue = {
  routerReady: boolean;
  uploadKind: CatalogueSupplierImportUploadKind;
  changeUploadKind: (kind: CatalogueSupplierImportUploadKind) => void;
  file: File | null;
  selectFile: (file: File | null) => void;
  submitting: boolean;
  progressPct: number | null;
  progressLabel: string;
  submitImport: () => Promise<void>;
  batchMaxLabel: string;
};

const ImportSupplierPricesContext =
  createContext<ImportSupplierPricesContextValue | null>(null);

export function ImportSupplierPricesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [uploadKind, setUploadKind] =
    useState<CatalogueSupplierImportUploadKind>('nvs_non_pom_csv');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progressPct, setProgressPct] = useState<number | null>(null);
  const [progressLabel, setProgressLabel] = useState('');

  const changeUploadKind = useCallback(
    (kind: CatalogueSupplierImportUploadKind) => {
      setUploadKind(kind);
      setFile(null);
    },
    [],
  );

  const selectFile = useCallback((f: File | null) => {
    setFile(f);
  }, []);

  const submitImport = useCallback(async () => {
    if (!file) {
      toast.error('Choose a file.');
      return;
    }

    setSubmitting(true);
    setProgressPct(0);
    setProgressLabel('Scanning file…');

    try {
      if (uploadKind === 'nvs_non_pom_csv') {
        const totalDataRows = await countValidNvsDataRows(file);
        if (totalDataRows === 0) {
          throw new Error('NO_DATA_ROWS');
        }
        setProgressLabel(
          `Processed 0 / ${totalDataRows.toLocaleString()} rows`,
        );
        const { totalImported, totalSkipped, nvsNonPomTotals } =
          await runNvsCsvBatchedImport(
            file,
            postCatalogueImportSupplierPricesBatch,
            ({ rowsPosted, totalDataRows: total }) => {
              const pct = Math.min(100, Math.round((rowsPosted / total) * 100));
              setProgressPct(pct);
              setProgressLabel(
                `Processed ${rowsPosted.toLocaleString()} / ${total.toLocaleString()} rows`,
              );
            },
            { totalDataRows },
          );
        setProgressPct(100);
        setProgressLabel(
          `Processed ${totalDataRows.toLocaleString()} / ${totalDataRows.toLocaleString()} rows`,
        );
        const netNewListings =
          (nvsNonPomTotals?.newListingOnMatchedProduct ?? 0) +
          (nvsNonPomTotals?.newProductWithListing ?? 0);
        toast.success(
          `Imported ${totalImported.toLocaleString()} rows (${netNewListings.toLocaleString()} new NVS listings, ${(nvsNonPomTotals?.updatedExistingListing ?? 0).toLocaleString()} mapped SKU updates, ${(nvsNonPomTotals?.updatedOrphanListing ?? 0).toLocaleString()} orphan listing-only updates). Skipped ${totalSkipped.toLocaleString()}.`,
        );
      } else if (uploadKind === 'nvs_all_products') {
        const totalDataRows = await countValidNvsAllProductsDataRows(file);
        if (totalDataRows === 0) {
          throw new Error('NO_DATA_ROWS');
        }
        setProgressLabel(
          `Processed 0 / ${totalDataRows.toLocaleString()} rows`,
        );
        const { totalImported, totalSkipped } =
          await runNvsAllProductsBatchedImport(
            file,
            postCatalogueImportSupplierPricesBatch,
            ({ rowsPosted, totalDataRows: total }) => {
              const pct = Math.min(100, Math.round((rowsPosted / total) * 100));
              setProgressPct(pct);
              setProgressLabel(
                `Processed ${rowsPosted.toLocaleString()} / ${total.toLocaleString()} rows`,
              );
            },
            { totalDataRows },
          );
        setProgressPct(100);
        setProgressLabel(
          `Processed ${totalDataRows.toLocaleString()} / ${totalDataRows.toLocaleString()} rows`,
        );
        toast.success(
          `Imported ${totalImported.toLocaleString()} rows. Skipped ${totalSkipped.toLocaleString()}.`,
        );
      } else {
        const totalDataRows = await countValidVeenakDataRows(file);
        if (totalDataRows === 0) {
          throw new Error('NO_DATA_ROWS');
        }
        setProgressLabel(
          `Processed 0 / ${totalDataRows.toLocaleString()} rows`,
        );
        const { totalImported, totalSkipped } = await runVeenakCsvBatchedImport(
          file,
          postCatalogueImportSupplierPricesBatch,
          ({ rowsPosted, totalDataRows: total }) => {
            const pct = Math.min(100, Math.round((rowsPosted / total) * 100));
            setProgressPct(pct);
            setProgressLabel(
              `Processed ${rowsPosted.toLocaleString()} / ${total.toLocaleString()} rows`,
            );
          },
          { totalDataRows },
        );
        setProgressPct(100);
        setProgressLabel(
          `Processed ${totalDataRows.toLocaleString()} / ${totalDataRows.toLocaleString()} rows`,
        );
        toast.success(
          `Imported ${totalImported.toLocaleString()} rows. Skipped ${totalSkipped.toLocaleString()}.`,
        );
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'NO_DATA_ROWS') {
        toast.error('No importable data rows found in this file.');
      } else if (isAxiosError(err)) {
        toast.error(
          'Import stopped. Earlier batches may already be saved; check the catalogue or retry.',
        );
      } else {
        toast.error('Import failed. Try again.');
      }
    } finally {
      setSubmitting(false);
      setProgressPct(null);
      setProgressLabel('');
    }
  }, [file, uploadKind]);

  const batchMaxLabel =
    uploadKind === 'veenak_csv'
      ? VEENAK_IMPORT_BATCH_MAX.toLocaleString()
      : NVS_IMPORT_BATCH_MAX.toLocaleString();

  const value = useMemo<ImportSupplierPricesContextValue>(
    () => ({
      routerReady: router.isReady,
      uploadKind,
      changeUploadKind,
      file,
      selectFile,
      submitting,
      progressPct,
      progressLabel,
      submitImport,
      batchMaxLabel,
    }),
    [
      router.isReady,
      uploadKind,
      changeUploadKind,
      file,
      selectFile,
      submitting,
      progressPct,
      progressLabel,
      submitImport,
      batchMaxLabel,
    ],
  );

  return (
    <ImportSupplierPricesContext.Provider value={value}>
      {children}
    </ImportSupplierPricesContext.Provider>
  );
}

export function useImportSupplierPrices(): ImportSupplierPricesContextValue {
  const ctx = useContext(ImportSupplierPricesContext);
  if (!ctx) {
    throw new Error(
      'useImportSupplierPrices must be used within ImportSupplierPricesProvider',
    );
  }
  return ctx;
}
