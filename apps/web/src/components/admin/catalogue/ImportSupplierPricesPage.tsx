'use client';

import { Button } from '@/components/ui/Button';
import { FileInput } from '@/components/ui/FileInput';
import { Select } from '@/components/ui/Select';
import type { CatalogueSupplierImportUploadKind } from '@vetply/shared';
import {
  ImportSupplierPricesProvider,
  useImportSupplierPrices,
} from './ImportSupplierPricesContext';

export type ImportSupplierPricesFormProps = {
  uploadKind: CatalogueSupplierImportUploadKind;
  changeUploadKind: (kind: CatalogueSupplierImportUploadKind) => void;
  selectFile: (file: File | null) => void;
  submitting: boolean;
  progressPct: number | null;
  progressLabel: string;
  submitImport: () => Promise<void>;
  batchMaxLabel: string;
  file: File | null;
};

function ImportSupplierPricesForm({
  uploadKind,
  changeUploadKind,
  selectFile,
  submitting,
  progressPct,
  progressLabel,
  submitImport,
  batchMaxLabel,
  file,
}: ImportSupplierPricesFormProps) {
  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-lg font-semibold text-white">
        Import supplier listing files
      </h1>
      <p className="mt-2 text-sm text-gray-400">
        Choose the supplier file type, then select your file. Only fields that
        map to the catalogue schema are imported. Large files are sent in
        batches of {batchMaxLabel} rows.
      </p>
      <form
        className="mt-8 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          void submitImport();
        }}
      >
        <div>
          <label
            htmlFor="catalogue-import-kind"
            className="block text-sm font-medium text-gray-200"
          >
            File type
          </label>
          <Select
            id="catalogue-import-kind"
            name="catalogueImportKind"
            className="mt-2"
            value={uploadKind}
            disabled={submitting}
            onChange={(ev) => {
              changeUploadKind(
                ev.target.value as CatalogueSupplierImportUploadKind,
              );
            }}
          >
            <option value="nvs_non_pom_csv">NVS - Non-POM Products CSV</option>
            <option value="nvs_all_products">NVS - All Products</option>
            <option value="veenak_csv">Veenak - Full price list CSV</option>
          </Select>
        </div>
        <div>
          <label
            htmlFor="import-supplier-prices-file"
            className="block text-sm font-medium text-gray-200"
          >
            File
          </label>
          <FileInput
            key={uploadKind}
            id="import-supplier-prices-file"
            name="file"
            className="mt-2"
            disabled={submitting}
            onChange={(ev) => {
              const f = ev.target.files?.[0];
              selectFile(f ?? null);
            }}
          />
        </div>

        {progressPct !== null ? (
          <div className="space-y-2">
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Import progress"
            >
              <div
                className="h-full rounded-full bg-primary-500 transition-[width] duration-200 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-sm text-gray-400">{progressLabel}</p>
          </div>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={submitting || !file}
        >
          {submitting ? 'Importing…' : 'Import'}
        </Button>
      </form>
    </div>
  );
}

function ImportSupplierPricesPageBody() {
  const {
    routerReady,
    uploadKind,
    changeUploadKind,
    selectFile,
    submitting,
    progressPct,
    progressLabel,
    submitImport,
    batchMaxLabel,
    file,
  } = useImportSupplierPrices();

  if (!routerReady) {
    return null;
  }

  return (
    <ImportSupplierPricesForm
      uploadKind={uploadKind}
      changeUploadKind={changeUploadKind}
      selectFile={selectFile}
      submitting={submitting}
      progressPct={progressPct}
      progressLabel={progressLabel}
      submitImport={submitImport}
      batchMaxLabel={batchMaxLabel}
      file={file}
    />
  );
}

export function ImportSupplierPricesPage() {
  return (
    <ImportSupplierPricesProvider>
      <ImportSupplierPricesPageBody />
    </ImportSupplierPricesProvider>
  );
}
