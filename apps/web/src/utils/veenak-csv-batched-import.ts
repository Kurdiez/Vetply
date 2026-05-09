import type {
  ImportSupplierPricesBatchReq,
  ImportSupplierPricesBatchRes,
  VeenakImportRow,
} from '@vetply/shared';
import { Supplier, VEENAK_IMPORT_BATCH_MAX } from '@vetply/shared';
import Papa from 'papaparse';

const VEENAK_MIN_COLS = 5;

function cell(data: unknown[], i: number): string {
  const v = data[i];
  if (v === null || v === undefined) {
    return '';
  }
  return String(v).trim();
}

export function mapPapaRowToVeenak(data: unknown[]): VeenakImportRow | null {
  if (!Array.isArray(data) || data.length < VEENAK_MIN_COLS) {
    return null;
  }
  return {
    productName: cell(data, 0),
    packSize: cell(data, 1),
    form: cell(data, 2),
    productId: cell(data, 3),
    newPrice: cell(data, 4),
  };
}

export function countValidVeenakDataRows(file: File): Promise<number> {
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
        if (mapPapaRowToVeenak(data) !== null) {
          count += 1;
        }
      },
      complete: () => resolve(count),
      error: (err: Error) => reject(err),
    });
  });
}

export type VeenakImportProgress = {
  rowsPosted: number;
  totalDataRows: number;
};

export type VeenakImportTotals = {
  totalImported: number;
  totalSkipped: number;
};

export type RunVeenakCsvBatchedImportOptions = {
  totalDataRows?: number;
};

export async function runVeenakCsvBatchedImport(
  file: File,
  postBatch: (
    body: ImportSupplierPricesBatchReq,
  ) => Promise<ImportSupplierPricesBatchRes>,
  onProgress: (p: VeenakImportProgress) => void,
  options?: RunVeenakCsvBatchedImportOptions,
): Promise<VeenakImportTotals> {
  const totalDataRows =
    options?.totalDataRows ?? (await countValidVeenakDataRows(file));
  if (totalDataRows === 0) {
    throw new Error('NO_DATA_ROWS');
  }

  const totalBatches = Math.ceil(totalDataRows / VEENAK_IMPORT_BATCH_MAX);
  onProgress({ rowsPosted: 0, totalDataRows });

  return new Promise((resolve, reject) => {
    let rowIdx = 0;
    const buf: VeenakImportRow[] = [];
    let chain: Promise<void> = Promise.resolve();
    let batchIdx = 0;
    let rowsPosted = 0;
    let totalImported = 0;
    let totalSkipped = 0;

    const schedule = (fn: () => Promise<void>) => {
      chain = chain.then(fn).catch((e: unknown) => {
        reject(e instanceof Error ? e : new Error(String(e)));
        throw e;
      });
    };

    const flush = async (rows: VeenakImportRow[], index: number) => {
      const res = await postBatch({
        supplier: Supplier.VEENAK,
        batchIndex: index,
        totalBatches,
        totalDataRows,
        rows,
      });
      totalImported += res.rowsImported;
      totalSkipped += res.rowsSkipped;
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
        const row = mapPapaRowToVeenak(data);
        if (!row) {
          return;
        }
        schedule(async () => {
          buf.push(row);
          if (buf.length >= VEENAK_IMPORT_BATCH_MAX) {
            const batch = buf.splice(0, VEENAK_IMPORT_BATCH_MAX);
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
            resolve({ totalImported, totalSkipped });
          })
          .catch(reject);
      },
      error: (err: Error) => {
        reject(err);
      },
    });
  });
}
