'use client';

import type { CatalogueProductsImportRunResult } from '@/utils/catalogue-mapping-import-runners';
import { MappingImportFailuresTable } from './MappingImportFailuresTable';

export type CatalogueProductsImportReportBodyProps = {
  result: CatalogueProductsImportRunResult;
};

export function CatalogueProductsImportReportBody({
  result,
}: CatalogueProductsImportReportBodyProps) {
  return (
    <div className="mt-4 space-y-2 text-sm text-gray-300">
      <p>
        Products removed (were not in this CSV):{' '}
        <span className="font-semibold text-white">
          {result.deletedCount.toLocaleString()}
        </span>
      </p>
      <p>
        Data rows in file:{' '}
        <span className="font-semibold text-white">
          {result.totalDataRows.toLocaleString()}
        </span>
      </p>
      <p>
        Rows upserted:{' '}
        <span className="font-semibold text-white">
          {result.rowsUpserted.toLocaleString()}
        </span>
      </p>
      <p>
        Rows with issues:{' '}
        <span className="font-semibold text-white">
          {result.failures.length.toLocaleString()}
        </span>
      </p>
      <MappingImportFailuresTable failures={result.failures} />
    </div>
  );
}
