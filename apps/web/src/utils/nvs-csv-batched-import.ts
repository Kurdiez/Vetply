import type {
  ImportSupplierPricesBatchReq,
  ImportSupplierPricesBatchRes,
  NvsImportRow,
  NvsNonPomBatchBreakdown,
} from "@vetply/shared";
import { NVS_IMPORT_BATCH_MAX, Supplier } from "@vetply/shared";
import Papa from "papaparse";

const NVS_MIN_COLS = 11;

function cell(data: unknown[], i: number): string {
  const v = data[i];
  if (v === null || v === undefined) {
    return "";
  }
  return String(v).trim();
}

export function mapPapaRowToNvs(data: unknown[]): NvsImportRow | null {
  if (!Array.isArray(data) || data.length < NVS_MIN_COLS) {
    return null;
  }
  return {
    salesGroup: cell(data, 0),
    partNo: cell(data, 2),
    description: cell(data, 3),
    uom: cell(data, 5),
    vpp: cell(data, 6),
    pom: cell(data, 7),
    manufacturer: cell(data, 8),
    legalLabel: cell(data, 10),
  };
}

export function countValidNvsDataRows(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    let rowIndex = 0;
    let count = 0;
    Papa.parse<unknown[]>(file, {
      skipEmptyLines: true,
      header: false,
      step: (results) => {
        const data = results.data;
        if (!Array.isArray(data)) {
          return;
        }
        if (rowIndex++ === 0) {
          return;
        }
        if (mapPapaRowToNvs(data) !== null) {
          count += 1;
        }
      },
      complete: () => resolve(count),
      error: (err: Error) => reject(err),
    });
  });
}

export type NvsImportProgress = {
  rowsPosted: number;
  totalDataRows: number;
};

export type NvsImportTotals = {
  totalImported: number;
  totalSkipped: number;
  /** Aggregated across all batches for NVS Non-POM only; omit otherwise. */
  nvsNonPomTotals?: NvsNonPomBatchBreakdown;
};

export type RunNvsCsvBatchedImportOptions = {
  /** When set, skips a second full-file scan for row count (caller should count first). */
  totalDataRows?: number;
};

export async function runNvsCsvBatchedImport(
  file: File,
  postBatch: (
    body: ImportSupplierPricesBatchReq,
  ) => Promise<ImportSupplierPricesBatchRes>,
  onProgress: (p: NvsImportProgress) => void,
  options?: RunNvsCsvBatchedImportOptions,
): Promise<NvsImportTotals> {
  const totalDataRows =
    options?.totalDataRows ?? (await countValidNvsDataRows(file));
  if (totalDataRows === 0) {
    throw new Error("NO_DATA_ROWS");
  }

  const totalBatches = Math.ceil(totalDataRows / NVS_IMPORT_BATCH_MAX);
  onProgress({ rowsPosted: 0, totalDataRows });

  return new Promise((resolve, reject) => {
    let rowIdx = 0;
    const buf: NvsImportRow[] = [];
    let chain: Promise<void> = Promise.resolve();
    let batchIdx = 0;
    let rowsPosted = 0;
    let totalImported = 0;
    let totalSkipped = 0;
    const nvsTotals: NvsNonPomBatchBreakdown = {
      updatedExistingListing: 0,
      newListingOnMatchedProduct: 0,
      newProductWithListing: 0,
    };

    const schedule = (fn: () => Promise<void>) => {
      chain = chain.then(fn).catch((e: unknown) => {
        reject(e instanceof Error ? e : new Error(String(e)));
        throw e;
      });
    };

    const flush = async (rows: NvsImportRow[], index: number) => {
      const res = await postBatch({
        supplier: Supplier.NVS,
        nvsFormat: "non_pom_csv",
        batchIndex: index,
        totalBatches,
        totalDataRows,
        rows,
      });
      totalImported += res.rowsImported;
      totalSkipped += res.rowsSkipped;
      const br = res.nvsNonPomBreakdown;
      if (br) {
        nvsTotals.updatedExistingListing += br.updatedExistingListing;
        nvsTotals.newListingOnMatchedProduct += br.newListingOnMatchedProduct;
        nvsTotals.newProductWithListing += br.newProductWithListing;
      }
    };

    Papa.parse<unknown[]>(file, {
      skipEmptyLines: true,
      header: false,
      step: (results) => {
        const data = results.data;
        if (!Array.isArray(data)) {
          return;
        }
        if (rowIdx++ === 0) {
          return;
        }
        const row = mapPapaRowToNvs(data);
        if (!row) {
          return;
        }
        schedule(async () => {
          buf.push(row);
          if (buf.length >= NVS_IMPORT_BATCH_MAX) {
            const batch = buf.splice(0, NVS_IMPORT_BATCH_MAX);
            await flush(batch, batchIdx);
            batchIdx += 1;
            rowsPosted += batch.length;
            onProgress({ rowsPosted, totalDataRows });
          }
        });
      },
      complete: () => {
        schedule(async () => {
          if (buf.length > 0) {
            const last = buf.splice(0);
            await flush(last, batchIdx);
            rowsPosted += last.length;
            onProgress({ rowsPosted, totalDataRows });
          }
        });
        chain = chain
          .then(() => {
            resolve({
              totalImported,
              totalSkipped,
              nvsNonPomTotals: nvsTotals,
            });
          })
          .catch(reject);
      },
      error: (err: Error) => {
        reject(err);
      },
    });
  });
}
