import type {
  ImportSupplierPricesBatchReq,
  ImportSupplierPricesBatchRes,
  NvsAllProductsImportRow,
} from "@vetply/shared";
import {
  NVS_IMPORT_BATCH_MAX,
  parseNvsAllProductsLine,
  Supplier,
} from "@vetply/shared";

export type NvsAllProductsImportProgress = {
  rowsPosted: number;
  totalDataRows: number;
};

export type NvsAllProductsImportTotals = {
  totalImported: number;
  totalSkipped: number;
};

export type RunNvsAllProductsBatchedImportOptions = {
  totalDataRows?: number;
};

export async function countValidNvsAllProductsDataRows(
  file: File,
): Promise<number> {
  const text = await file.text();
  let count = 0;
  for (const line of text.split(/\n/)) {
    if (parseNvsAllProductsLine(line) !== null) {
      count += 1;
    }
  }
  return count;
}

export async function runNvsAllProductsBatchedImport(
  file: File,
  postBatch: (
    body: ImportSupplierPricesBatchReq,
  ) => Promise<ImportSupplierPricesBatchRes>,
  onProgress: (p: NvsAllProductsImportProgress) => void,
  options?: RunNvsAllProductsBatchedImportOptions,
): Promise<NvsAllProductsImportTotals> {
  const text = await file.text();
  const allRows: NvsAllProductsImportRow[] = [];
  for (const line of text.split(/\n/)) {
    const parsed = parseNvsAllProductsLine(line);
    if (parsed) {
      allRows.push(parsed);
    }
  }
  const totalDataRows = options?.totalDataRows ?? allRows.length;
  if (totalDataRows === 0 || allRows.length === 0) {
    throw new Error("NO_DATA_ROWS");
  }

  const totalBatches = Math.ceil(totalDataRows / NVS_IMPORT_BATCH_MAX);
  onProgress({ rowsPosted: 0, totalDataRows });

  let totalImported = 0;
  let totalSkipped = 0;
  let rowsPosted = 0;

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx += 1) {
    const start = batchIdx * NVS_IMPORT_BATCH_MAX;
    const rows = allRows.slice(start, start + NVS_IMPORT_BATCH_MAX);
    const res = await postBatch({
      supplier: Supplier.NVS,
      nvsFormat: "all_products",
      batchIndex: batchIdx,
      totalBatches,
      totalDataRows,
      rows,
    });
    totalImported += res.rowsImported;
    totalSkipped += res.rowsSkipped;
    rowsPosted += rows.length;
    onProgress({ rowsPosted, totalDataRows });
  }

  return { totalImported, totalSkipped };
}
