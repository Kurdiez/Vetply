"use client";

import { TablePagination } from "@/components/ui/data-table/TablePagination";
import { useCatalogueView } from "./CatalogueViewContext";

export function CatalogueProductsPagination() {
  const { page, pageSize, totalCount, setPage, status } = useCatalogueView();

  return (
    <TablePagination
      page={page}
      pageSize={pageSize}
      totalCount={totalCount}
      onPageChange={setPage}
      disabled={status === "loading"}
    />
  );
}
