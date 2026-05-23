import {
  CATALOGUE_PRODUCTS_IMPORT_BATCH_MAX,
  SUPPLIER_LISTINGS_MAPPING_IMPORT_BATCH_MAX,
  findDuplicateCatalogueProductIdInSupplierListingsMappingRows,
  type CatalogueCsvImportRowFailure,
  type Supplier,
} from '@vetply/shared';
import { parseCatalogueProductsImportCsv } from '@/utils/catalogue-products-csv-import';
import { parseSupplierListingsMappingCsv } from '@/utils/supplier-listings-mapping-csv-import';
import {
  postCatalogueProductsImportBatch,
  postCatalogueProductsImportDeleteMissing,
  postSupplierListingsMappingImportBatch,
} from '@/utils/vetply-api/catalogue-api';
import { VetplyBadRequestError } from '@/utils/vetply-api/vetply-bad-request-error';
import { chunkArray, runPoolMapBatches } from '@/utils/run-pool-batches';

const IMPORT_PARALLEL_CONCURRENCY = 6;

export type CatalogueProductsImportRunResult = {
  deletedCount: number;
  totalDataRows: number;
  rowsUpserted: number;
  failures: CatalogueCsvImportRowFailure[];
};

export async function runCatalogueProductsMappingImport(
  file: File,
  onProgress: (pct: number) => void,
): Promise<CatalogueProductsImportRunResult> {
  const parsed = await parseCatalogueProductsImportCsv(file);

  onProgress(0);
  const deleteRes = await postCatalogueProductsImportDeleteMissing({
    productIdsInCsv: parsed.productIdsInCsv,
  });

  const failures: CatalogueCsvImportRowFailure[] = [...parsed.parseFailures];
  const rows = parsed.rows;
  const batches = chunkArray(rows, CATALOGUE_PRODUCTS_IMPORT_BATCH_MAX);
  const totalBatches = batches.length;
  const totalDataRows = rows.length;

  if (totalDataRows === 0) {
    return {
      deletedCount: deleteRes.deletedCount,
      totalDataRows: 0,
      rowsUpserted: 0,
      failures,
    };
  }

  let rowsPosted = 0;
  let rowsUpserted = 0;

  await runPoolMapBatches(
    batches,
    IMPORT_PARALLEL_CONCURRENCY,
    async (batch, batchIndex) => {
      const res = await postCatalogueProductsImportBatch({
        batchIndex,
        totalBatches,
        totalDataRows,
        rows: batch,
      });
      rowsPosted += batch.length;
      rowsUpserted += res.rowsUpserted;
      failures.push(...res.failures);
      onProgress(Math.min(100, Math.round((rowsPosted / totalDataRows) * 100)));
      return res;
    },
  );

  onProgress(100);

  return {
    deletedCount: deleteRes.deletedCount,
    totalDataRows,
    rowsUpserted,
    failures,
  };
}

export type SupplierListingsMappingImportRunResult = {
  totalDataRows: number;
  rowsUpdated: number;
  failures: CatalogueCsvImportRowFailure[];
};

export async function runSupplierListingsMappingImport(
  file: File,
  supplier: Supplier,
  onProgress: (pct: number) => void,
): Promise<SupplierListingsMappingImportRunResult> {
  const parsed = await parseSupplierListingsMappingCsv(file);
  const failures: CatalogueCsvImportRowFailure[] = [...parsed.parseFailures];
  const rows = parsed.rows;

  const duplicateFailReason =
    findDuplicateCatalogueProductIdInSupplierListingsMappingRows(rows);
  if (duplicateFailReason !== null) {
    throw new VetplyBadRequestError(duplicateFailReason);
  }

  const batches = chunkArray(rows, SUPPLIER_LISTINGS_MAPPING_IMPORT_BATCH_MAX);
  const totalBatches = batches.length;
  const totalDataRows = rows.length;

  if (totalDataRows === 0) {
    return { totalDataRows: 0, rowsUpdated: 0, failures };
  }

  let rowsPosted = 0;
  let rowsUpdated = 0;
  onProgress(0);

  await runPoolMapBatches(
    batches,
    IMPORT_PARALLEL_CONCURRENCY,
    async (batch, batchIndex) => {
      const res = await postSupplierListingsMappingImportBatch({
        supplier,
        batchIndex,
        totalBatches,
        totalDataRows,
        rows: batch,
      });
      rowsPosted += batch.length;
      rowsUpdated += res.rowsUpdated;
      failures.push(...res.failures);
      onProgress(Math.min(100, Math.round((rowsPosted / totalDataRows) * 100)));
      return res;
    },
  );

  onProgress(100);

  return {
    totalDataRows,
    rowsUpdated,
    failures,
  };
}
