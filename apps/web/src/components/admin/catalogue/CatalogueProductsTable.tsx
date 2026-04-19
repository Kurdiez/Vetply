"use client";

import {
  DataTable,
  type DataTableColumn,
} from "@/components/ui/data-table/DataTable";
import { Button } from "@/components/ui/Button";
import { CATALOGUE_RETURN_URL_STORAGE_KEY } from "@/constants/catalogue-session";
import { routes } from "@/constants/routes";
import {
  CatalogueFilterFieldId,
  type CatalogueProductListItem,
} from "@vetply/shared";
import { useRouter } from "next/router";
import type { CatalogueSortFieldId } from "./catalogue-filter-model";
import { buildCatalogueListUrl } from "./catalogue-list-url";
import { useCatalogueView } from "./CatalogueViewContext";

const COLUMNS: DataTableColumn[] = [
  { id: CatalogueFilterFieldId.Name, header: "Name" },
  {
    id: CatalogueFilterFieldId.ManufacturerName,
    header: "Manufacturer",
  },
  {
    id: CatalogueFilterFieldId.SalesCategory,
    header: "Sales category",
  },
  {
    id: CatalogueFilterFieldId.LegalCategory,
    header: "Legal category",
  },
  { id: CatalogueFilterFieldId.Pom, header: "POM" },
];

export function CatalogueProductsTable() {
  const router = useRouter();
  const {
    items,
    status,
    refetch,
    sort,
    toggleSortColumn,
    page,
    pageSize,
    appliedFilters,
  } = useCatalogueView();

  if (status === "loading" && items.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-white/10 bg-gray-800/50 px-4 py-12 text-center text-sm text-gray-400">
        Loading catalogue…
      </div>
    );
  }

  if (status === "error" && items.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center gap-4 rounded-lg border border-white/10 bg-gray-800/50 px-4 py-12 text-center">
        <p className="text-sm text-gray-300">Could not load products.</p>
        <Button type="button" variant="secondary" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (status === "ready" && items.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-white/10 bg-gray-800/50 px-4 py-12 text-center text-sm text-gray-400">
        No products in the catalogue yet. Import supplier prices to add items.
      </div>
    );
  }

  return (
    <DataTable
      className="mt-6 flow-root"
      columns={COLUMNS}
      rows={items}
      sortableColumnIds={COLUMNS.map((c) => c.id)}
      sortColumnId={sort?.fieldId ?? null}
      sortDirection={sort?.direction ?? null}
      onSortColumnClick={(columnId) =>
        toggleSortColumn(columnId as CatalogueSortFieldId)
      }
      getRowKey={(row) => row.id}
      onRowClick={(row) => {
        const returnUrl = buildCatalogueListUrl(routes.admin.catalogue.view, {
          page,
          pageSize,
          appliedFilters,
          sort,
        });
        try {
          sessionStorage.setItem(CATALOGUE_RETURN_URL_STORAGE_KEY, returnUrl);
        } catch {
          /* ignore quota / private mode */
        }
        void router.push(routes.admin.catalogue.productDetail(row.id));
      }}
      renderCell={(row, columnId) => {
        if (columnId === CatalogueFilterFieldId.Pom) {
          if (row.pom === null) {
            return "—";
          }
          return row.pom ? "Yes" : "No";
        }
        const v = row[columnId as keyof CatalogueProductListItem];
        if (v === null || v === undefined) {
          return "—";
        }
        return typeof v === "string" || typeof v === "boolean" ? String(v) : "";
      }}
    />
  );
}
