'use client';

import { AdminListSearchField } from '@/components/admin/list/AdminListSearchField';
import { useCatalogueView } from './CatalogueViewContext';

export function CatalogueNameSearch() {
  const { searchInput, setSearchInput } = useCatalogueView();

  return (
    <AdminListSearchField
      id="catalogue-product-name-search"
      label="Search products"
      placeholder="Search by product name…"
      value={searchInput}
      onChange={setSearchInput}
    />
  );
}
