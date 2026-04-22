"use client";

import { Button } from "@/components/ui/Button";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/ui/data-table/DataTable";
import {
  CatalogueFilterFieldId,
  type CatalogueProductListItem,
} from "@vetply/shared";
import type { CatalogueSortFieldId } from "./catalogue-filter-model";
import { CatalogueProductThumbnail } from "./CatalogueProductThumbnail";
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
  { id: "image", header: "" },
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
  { id: "bestSupplierName", header: "Best supplier" },
  { id: "bestPrice", header: "Best price" },
];

export function CatalogueProductsTable() {
  const {
    items,
    status,
    refetch,
    sort,
    toggleSortColumn,
    navigateToProduct,
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
      onRowClick={(row) => navigateToProduct(row.id)}
      getRowKey={(row) => row.id}
      renderCell={(row, columnId) => {
        if (columnId === "image") {
          return (
            <CatalogueProductThumbnail
              imageUrl={row.image}
              productName={row.name}
            />
          );
        }
        if (columnId === "unit") {
          return `${row.unitQuantity} ${row.unitType}`;
        }
        if (columnId === "bestSupplierName") {
          return row.bestSupplierName ?? "—";
        }
        if (columnId === "bestPrice") {
          if (row.bestPrice === null) {
            return "—";
          }
          return row.bestPrice;
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
