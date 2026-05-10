'use client';

import { TablePagination } from '@/components/ui/data-table/TablePagination';
import { useSupplierListingsView } from './SupplierListingsViewContext';

export function SupplierListingsPagination() {
  const { page, pageSize, totalCount, setPage, status } =
    useSupplierListingsView();

  return (
    <TablePagination
      page={page}
      pageSize={pageSize}
      totalCount={totalCount}
      onPageChange={setPage}
      disabled={status === 'loading'}
    />
  );
}
