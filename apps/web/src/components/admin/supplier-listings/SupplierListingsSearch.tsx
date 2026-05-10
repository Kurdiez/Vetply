'use client';

import { AdminListSearchField } from '@/components/admin/list/AdminListSearchField';
import { useSupplierListingsView } from './SupplierListingsViewContext';

export function SupplierListingsSearch() {
  const { searchInput, setSearchInput } = useSupplierListingsView();

  return (
    <AdminListSearchField
      id="supplier-listing-name-search"
      label="Search listings"
      placeholder="Search by listing name…"
      value={searchInput}
      onChange={setSearchInput}
    />
  );
}
