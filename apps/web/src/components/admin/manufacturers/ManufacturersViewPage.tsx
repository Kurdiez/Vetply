'use client';

import { AdminListPageHeader } from '@/components/admin/list/AdminListPageHeader';
import { AdminListStack } from '@/components/admin/list/AdminListStack';
import { Button } from '@/components/ui/Button';
import { ManufacturersAddModalContainer } from './ManufacturersAddModalContainer';
import { ManufacturersEditModalContainer } from './ManufacturersEditModalContainer';
import { ManufacturersTableSection } from './ManufacturersTableSection';
import {
  ManufacturersViewProvider,
  useManufacturersView,
} from './ManufacturersViewContext';

function ManufacturersViewPageBody() {
  const c = useManufacturersView();

  return (
    <div>
      <AdminListPageHeader
        title="Manufacturers"
        description="Catalogue product manufacturers. Add or edit names used when assigning products."
        actions={
          <Button type="button" onClick={c.openAddModal}>
            Add manufacturer
          </Button>
        }
      />
      <AdminListStack>
        <ManufacturersTableSection />
      </AdminListStack>
      <ManufacturersAddModalContainer />
      <ManufacturersEditModalContainer />
    </div>
  );
}

export function ManufacturersViewPage() {
  return (
    <ManufacturersViewProvider>
      <ManufacturersViewPageBody />
    </ManufacturersViewProvider>
  );
}
