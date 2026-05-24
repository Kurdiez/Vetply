'use client';

import { ManufacturerFormModal } from './ManufacturerFormModal';
import { useManufacturersView } from './ManufacturersViewContext';

export function ManufacturersAddModalContainer() {
  const c = useManufacturersView();

  return (
    <ManufacturerFormModal
      open={c.addModalOpen}
      title="Add manufacturer"
      initialName=""
      submitting={c.submitting}
      onClose={c.closeAddModal}
      onSubmit={c.createManufacturer}
    />
  );
}
