'use client';

import type { Supplier } from '@vetply/shared';
import type { SupplierListingsMappingImportRunResult } from '@/utils/catalogue-mapping-import-runners';
import { MappingImportFailuresTable } from './MappingImportFailuresTable';

export type SupplierListingsMappingImportReportBodyProps = {
  supplier: Supplier;
  result: SupplierListingsMappingImportRunResult;
};

export function SupplierListingsMappingImportReportBody({
  supplier,
  result,
}: SupplierListingsMappingImportReportBodyProps) {
  return (
    <div className="mt-4 space-y-2 text-sm text-gray-300">
      <p className="text-gray-400">
        Supplier: <span className="font-semibold text-white">{supplier}</span>
      </p>
      <p>
        Data rows in file:{' '}
        <span className="font-semibold text-white">
          {result.totalDataRows.toLocaleString()}
        </span>
      </p>
      <p>
        Listings updated:{' '}
        <span className="font-semibold text-white">
          {result.rowsUpdated.toLocaleString()}
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
