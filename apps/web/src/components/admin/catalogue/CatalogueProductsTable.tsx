'use client';

import { Button } from '@/components/ui/Button';
import {
  DataTable,
  type DataTableColumn,
} from '@/components/ui/data-table/DataTable';
import {
  CatalogueListSortFieldId,
  type CatalogueProductListItem,
} from '@vetply/shared';
import type { CatalogueSortFieldId } from './catalogue-filter-model';
import { CatalogueProductThumbnail } from './CatalogueProductThumbnail';
import type { CatalogueSortState } from './catalogue-sort';

type CatalogueViewStatus = 'idle' | 'loading' | 'ready' | 'error';

const SORTABLE_COLUMN_IDS: CatalogueSortFieldId[] = [
  CatalogueListSortFieldId.Name,
  CatalogueListSortFieldId.ManufacturerName,
  CatalogueListSortFieldId.Supplier,
  CatalogueListSortFieldId.CovetrusPrice,
  CatalogueListSortFieldId.NvsPrice,
  CatalogueListSortFieldId.VeenakPrice,
  CatalogueListSortFieldId.MwiahPrice,
];

const COLUMNS: DataTableColumn[] = [
  { id: 'select', header: '' },
  { id: 'image', header: '' },
  { id: CatalogueListSortFieldId.Name, header: 'Name' },
  {
    id: CatalogueListSortFieldId.ManufacturerName,
    header: 'Manufacturer',
  },
  { id: 'unit', header: 'Unit' },
  { id: CatalogueListSortFieldId.CovetrusPrice, header: 'Covetrus price' },
  { id: CatalogueListSortFieldId.NvsPrice, header: 'NVS price' },
  { id: CatalogueListSortFieldId.VeenakPrice, header: 'Veenak price' },
  { id: CatalogueListSortFieldId.MwiahPrice, header: 'MWIAH price' },
];

function formatPriceCell(value: string | null): string {
  if (value === null) {
    return '—';
  }
  return value;
}

export type CatalogueProductsTableProps = {
  items: CatalogueProductListItem[];
  status: CatalogueViewStatus;
  refetch: () => void;
  sort: CatalogueSortState;
  toggleSortColumn: (fieldId: CatalogueSortFieldId) => void;
  navigateToProduct: (productId: string) => void;
  toggleProductSelection: (productId: string) => void;
  isProductSelected: (productId: string) => boolean;
};

export function CatalogueProductsTable({
  items,
  status,
  refetch,
  sort,
  toggleSortColumn,
  navigateToProduct,
  toggleProductSelection,
  isProductSelected,
}: CatalogueProductsTableProps) {
  if (status === 'loading' && items.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-white/10 bg-gray-800/50 px-4 py-12 text-center text-sm text-gray-400">
        Loading catalogue…
      </div>
    );
  }

  if (status === 'error' && items.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center gap-4 rounded-lg border border-white/10 bg-gray-800/50 px-4 py-12 text-center">
        <p className="text-sm text-gray-300">Could not load products.</p>
        <Button type="button" variant="secondary" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (status === 'ready' && items.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-white/10 bg-gray-800/50 px-4 py-12 text-center text-sm text-gray-400">
        No products in the catalogue yet. Import supplier listing files to add
        items.
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
      getRowClassName={(row) =>
        isProductSelected(row.id) ? 'bg-primary-500/15' : undefined
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
                  checked={isProductSelected(row.id)}
                  onChange={() => toggleProductSelection(row.id)}
                />
              </label>
            </span>
          );
        }
        if (columnId === 'image') {
          return (
            <CatalogueProductThumbnail
              imageUrl={row.image}
              productName={row.name}
            />
          );
        }
        if (columnId === 'unit') {
          return `${row.unitQuantity} ${row.unitType}`;
        }
        if (columnId === CatalogueListSortFieldId.CovetrusPrice) {
          return formatPriceCell(row.covetrusPrice);
        }
        if (columnId === CatalogueListSortFieldId.NvsPrice) {
          return formatPriceCell(row.nvsPrice);
        }
        if (columnId === CatalogueListSortFieldId.VeenakPrice) {
          return formatPriceCell(row.veenakPrice);
        }
        if (columnId === CatalogueListSortFieldId.MwiahPrice) {
          return formatPriceCell(row.mwiahPrice);
        }
        const v = row[columnId as keyof CatalogueProductListItem];
        if (v === null || v === undefined) {
          return '—';
        }
        return typeof v === 'string' || typeof v === 'boolean' ? String(v) : '';
      }}
    />
  );
}
