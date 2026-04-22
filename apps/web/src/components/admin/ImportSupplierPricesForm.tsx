"use client";

import { Button } from "@/components/ui/Button";
import { FileInput } from "@/components/ui/FileInput";
import { vetplyApiClient } from "@/utils/vetply-api/http-client";
import {
  countValidNvsDataRows,
  runNvsCsvBatchedImport,
} from "@/utils/nvs-csv-batched-import";
import {
  importSupplierPricesBatchResSchema,
  type ImportSupplierPricesBatchReq,
  NVS_IMPORT_BATCH_MAX,
  Supplier,
} from "@vetply/shared";
import { useRouter } from "next/router";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { isAxiosError } from "axios";

const BATCH_ENDPOINT = "/admin/catalogue/import-supplier-prices/batch";

export function ImportSupplierPricesForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progressPct, setProgressPct] = useState<number | null>(null);
  const [progressLabel, setProgressLabel] = useState("");

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!file) {
        toast.error("Choose a CSV file.");
        return;
      }

      setSubmitting(true);
      setProgressPct(0);
      setProgressLabel("Scanning file…");

      try {
        const postBatch = async (body: ImportSupplierPricesBatchReq) => {
          const { data } = await vetplyApiClient.post(BATCH_ENDPOINT, body);
          return importSupplierPricesBatchResSchema.parse(data);
        };

        const totalDataRows = await countValidNvsDataRows(file);

        if (totalDataRows === 0) {
          throw new Error("NO_DATA_ROWS");
        }

        setProgressLabel(
          `Processed 0 / ${totalDataRows.toLocaleString()} rows`,
        );

        const { totalImported, totalSkipped } = await runNvsCsvBatchedImport(
          file,
          postBatch,
          ({ rowsPosted, totalDataRows: total }) => {
            const pct = Math.min(
              100,
              Math.round((rowsPosted / total) * 100),
            );
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
      } catch (err) {
        if (err instanceof Error && err.message === "NO_DATA_ROWS") {
          toast.error("No importable data rows found in this file.");
        } else if (isAxiosError(err)) {
          toast.error(
            "Import stopped. Earlier batches may already be saved; check the catalogue or retry.",
          );
        } else {
          toast.error("Import failed. Try again.");
        }
      } finally {
        setSubmitting(false);
        setProgressPct(null);
        setProgressLabel("");
      }
    },
    [file],
  );

  if (!router.isReady) {
    return null;
  }

  const batchMaxLabel = NVS_IMPORT_BATCH_MAX.toLocaleString();

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-lg font-semibold text-white">Import supplier prices</h1>
      <p className="mt-2 text-sm text-gray-400">
        Upload an NVS supplier price CSV. Only fields that map to the catalogue
        schema are imported. Large files are sent in batches of {batchMaxLabel}{" "}
        rows.
      </p>
      <form className="mt-8 space-y-6" onSubmit={onSubmit}>
        <input type="hidden" name="supplier" value={Supplier.NVS} />
        <div>
          <label
            htmlFor="import-supplier-prices-file"
            className="block text-sm font-medium text-gray-200"
          >
            CSV file
          </label>
          <FileInput
            id="import-supplier-prices-file"
            name="file"
            className="mt-2"
            accept=".csv,text/csv"
            disabled={submitting}
            onChange={(ev) => {
              const f = ev.target.files?.[0];
              setFile(f ?? null);
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
          {submitting ? "Importing…" : "Import"}
        </Button>
      </form>
    </div>
  );
}
