'use client';

import { TablePagination } from '@/components/ui/data-table/TablePagination';

type CatalogueViewStatus = 'idle' | 'loading' | 'ready' | 'error';

export type CatalogueProductsPaginationProps = {
  page: number;
  pageSize: number;
  totalCount: number;
  setPage: (page: number) => void;
  status: CatalogueViewStatus;
};

export function CatalogueProductsPagination({
  page,
  pageSize,
  totalCount,
  setPage,
  status,
}: CatalogueProductsPaginationProps) {
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
