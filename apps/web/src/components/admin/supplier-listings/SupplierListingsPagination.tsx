'use client';

import { TablePagination } from '@/components/ui/data-table/TablePagination';

type SupplierListingsViewStatus = 'idle' | 'loading' | 'ready' | 'error';

export type SupplierListingsPaginationProps = {
  page: number;
  pageSize: number;
  totalCount: number;
  setPage: (page: number) => void;
  status: SupplierListingsViewStatus;
};

export function SupplierListingsPagination({
  page,
  pageSize,
  totalCount,
  setPage,
  status,
}: SupplierListingsPaginationProps) {
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
