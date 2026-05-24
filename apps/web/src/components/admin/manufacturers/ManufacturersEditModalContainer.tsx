'use client';

import { ManufacturerFormModal } from './ManufacturerFormModal';
import { useManufacturersView } from './ManufacturersViewContext';

export function ManufacturersEditModalContainer() {
  const c = useManufacturersView();

  return (
    <ManufacturerFormModal
      open={c.editingManufacturer !== null}
      title="Edit manufacturer"
      initialName={c.editingManufacturer?.name ?? ''}
      submitting={c.submitting}
      onClose={c.closeEditModal}
      onSubmit={async (name) => {
        if (!c.editingManufacturer) {
          return;
        }
        await c.updateManufacturer(c.editingManufacturer.id, name);
      }}
    />
  );
}
