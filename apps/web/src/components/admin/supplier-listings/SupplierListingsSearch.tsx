'use client';

import { AdminListSearchField } from '@/components/admin/list/AdminListSearchField';
import type { Dispatch, SetStateAction } from 'react';

export type SupplierListingsSearchProps = {
  searchInput: string;
  setSearchInput: Dispatch<SetStateAction<string>>;
};

export function SupplierListingsSearch({
  searchInput,
  setSearchInput,
}: SupplierListingsSearchProps) {
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
