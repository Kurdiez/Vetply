'use client';

import { Button } from '@/components/ui/Button';
import {
  DataTable,
  type DataTableColumn,
} from '@/components/ui/data-table/DataTable';
import {
  SupplierListingSortFieldId,
  type CatalogueSupplierListingListItem,
} from '@vetply/shared';

type SupplierListingSortColumnId =
  (typeof SupplierListingSortFieldId)[keyof typeof SupplierListingSortFieldId];
import { CatalogueProductThumbnail } from '@/components/admin/catalogue/CatalogueProductThumbnail';
import { useSupplierListingsView } from './SupplierListingsViewContext';

const SORTABLE_COLUMN_IDS = [
  SupplierListingSortFieldId.ListingName,
  SupplierListingSortFieldId.Supplier,
  SupplierListingSortFieldId.SupplierProductId,
  SupplierListingSortFieldId.ListedPrice,
  SupplierListingSortFieldId.CatalogProductName,
];

const COLUMNS: DataTableColumn[] = [
  { id: 'select', header: '' },
  { id: 'image', header: '' },
  { id: SupplierListingSortFieldId.ListingName, header: 'Name' },
  { id: SupplierListingSortFieldId.Supplier, header: 'Supplier' },
  {
    id: SupplierListingSortFieldId.SupplierProductId,
    header: 'Supplier product ID',
  },
  { id: SupplierListingSortFieldId.ListedPrice, header: 'Price' },
  {
    id: SupplierListingSortFieldId.CatalogProductName,
    header: 'Catalogue product',
  },
];

function formatPriceCell(value: string | null): string {
  if (value === null) {
    return '—';
  }
  return value;
}

export function SupplierListingsTable() {
  const {
    items,
    status,
    refetch,
    sort,
    toggleSortColumn,
    toggleListingSelection,
    isListingSelected,
  } = useSupplierListingsView();

  if (status === 'loading' && items.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-white/10 bg-gray-800/50 px-4 py-12 text-center text-sm text-gray-400">
        Loading supplier listings…
      </div>
    );
  }

  if (status === 'error' && items.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center gap-4 rounded-lg border border-white/10 bg-gray-800/50 px-4 py-12 text-center">
        <p className="text-sm text-gray-300">
          Could not load supplier listings.
        </p>
        <Button type="button" variant="secondary" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (status === 'ready' && items.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-white/10 bg-gray-800/50 px-4 py-12 text-center text-sm text-gray-400">
        No supplier listings match your filters.
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
        toggleSortColumn(columnId as SupplierListingSortColumnId)
      }
      getRowKey={(row) => row.id}
      getRowClassName={(row) =>
        isListingSelected(row.id) ? 'bg-primary-500/15' : undefined
      }
      renderCell={(row, columnId) => {
        if (columnId === 'select') {
          return (
            <span
              className="inline-flex items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <label className="flex cursor-pointer items-center gap-2">
                <span className="sr-only">Select {row.name}</span>
                <input
                  type="checkbox"
                  className="size-4 rounded border-white/20 bg-gray-700 text-primary-500 focus:ring-primary-500"
                  checked={isListingSelected(row.id)}
                  onChange={() => toggleListingSelection(row.id)}
                />
              </label>
            </span>
          );
        }
        if (columnId === 'image') {
          return (
            <CatalogueProductThumbnail
              imageUrl={row.thumbnailImage}
              productName={row.name}
            />
          );
        }
        if (columnId === SupplierListingSortFieldId.ListedPrice) {
          return formatPriceCell(row.listedPrice);
        }
        if (columnId === SupplierListingSortFieldId.ListingName) {
          return row.name;
        }
        if (columnId === SupplierListingSortFieldId.Supplier) {
          return row.supplierName;
        }
        if (columnId === SupplierListingSortFieldId.SupplierProductId) {
          return row.supplierProductId;
        }
        if (columnId === SupplierListingSortFieldId.CatalogProductName) {
          return row.catalogProductName ?? '—';
        }
        const k = columnId as keyof CatalogueSupplierListingListItem;
        const v = row[k];
        if (v === null || v === undefined) {
          return '—';
        }
        return typeof v === 'string' ? v : '';
      }}
    />
  );
}
