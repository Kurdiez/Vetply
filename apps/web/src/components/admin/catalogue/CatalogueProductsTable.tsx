"use client";

import {
  DataTable,
  type DataTableColumn,
} from "@/components/ui/data-table/DataTable";
import { Button } from "@/components/ui/Button";
import {
  CatalogueFilterFieldId,
  type CatalogueProductListItem,
} from "@vetply/shared";
import type { CatalogueSortFieldId } from "./catalogue-filter-model";
import { useCatalogueView } from "./CatalogueViewContext";

const SORTABLE_COLUMN_IDS: CatalogueSortFieldId[] = [
  CatalogueFilterFieldId.Name,
  CatalogueFilterFieldId.ManufacturerName,
  CatalogueFilterFieldId.SalesCategory,
  CatalogueFilterFieldId.LegalCategory,
  CatalogueFilterFieldId.Pom,
  CatalogueFilterFieldId.Supplier,
];

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
  { id: "unit", header: "Unit" },
  { id: "lowestPrice", header: "Lowest price" },
];

export function CatalogueProductsTable() {
  const {
    items,
    status,
    refetch,
    sort,
    toggleSortColumn,
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
      sortableColumnIds={SORTABLE_COLUMN_IDS}
      sortColumnId={sort?.fieldId ?? null}
      sortDirection={sort?.direction ?? null}
      onSortColumnClick={(columnId) =>
        toggleSortColumn(columnId as CatalogueSortFieldId)
      }
      getRowKey={(row) => row.id}
      renderCell={(row, columnId) => {
        if (columnId === "unit") {
          return `${row.unitQuantity} ${row.unitType}`;
        }
        if (columnId === "lowestPrice") {
          if (row.lowestPrice === null) {
            return "—";
          }
          return row.lowestPrice;
        }
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
