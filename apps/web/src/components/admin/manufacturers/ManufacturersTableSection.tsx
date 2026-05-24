'use client';

import { ManufacturersTable } from './ManufacturersTable';
import { useManufacturersView } from './ManufacturersViewContext';

export function ManufacturersTableSection() {
  const c = useManufacturersView();

  return (
    <ManufacturersTable
      rows={c.items}
      status={c.status}
      onEdit={c.openEditModal}
    />
  );
}
