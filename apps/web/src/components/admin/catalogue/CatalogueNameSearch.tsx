'use client';

import { AdminListSearchField } from '@/components/admin/list/AdminListSearchField';
import type { Dispatch, SetStateAction } from 'react';

export type CatalogueNameSearchProps = {
  searchInput: string;
  setSearchInput: Dispatch<SetStateAction<string>>;
};

export function CatalogueNameSearch({
  searchInput,
  setSearchInput,
}: CatalogueNameSearchProps) {
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
