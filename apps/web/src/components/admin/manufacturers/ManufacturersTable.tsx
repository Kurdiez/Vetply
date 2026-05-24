'use client';

import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/data-table/DataTable';
import type { CatalogueManufacturerOption } from '@vetply/shared';

const columns = [
  { id: 'name', header: 'Name' },
  { id: 'actions', header: 'Actions', className: 'text-right' },
];

export type ManufacturersTableProps = {
  rows: CatalogueManufacturerOption[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  onEdit: (manufacturer: CatalogueManufacturerOption) => void;
};

export function ManufacturersTable({
  rows,
  status,
  onEdit,
}: ManufacturersTableProps) {
  if (status === 'loading' || status === 'idle') {
    return <p className="mt-8 text-sm text-gray-400">Loading manufacturers…</p>;
  }

  if (status === 'error') {
    return (
      <p className="mt-8 text-sm text-danger-400">
        Could not load manufacturers.
      </p>
    );
  }

  if (rows.length === 0) {
    return <p className="mt-8 text-sm text-gray-400">No manufacturers yet.</p>;
  }

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.id}
      renderCell={(row, columnId) => {
        if (columnId === 'name') {
          return row.name;
        }
        if (columnId === 'actions') {
          return (
            <Button
              type="button"
              variant="secondary"
              onClick={() => onEdit(row)}
            >
              Edit
            </Button>
          );
        }
        return null;
      }}
    />
  );
}
