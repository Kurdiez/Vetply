'use client';

import { AppliedFiltersStack } from '@/components/ui/filters/AppliedFiltersStack';
import { useMemo } from 'react';
import type { AppliedSupplierListingFilter } from './supplier-listing-filter-model';
import { appliedSupplierListingFilterRows } from './supplier-listing-filter-model';

export type SupplierListingsAppliedFiltersListProps = {
  appliedFilters: AppliedSupplierListingFilter[];
  removeFilter: (id: string) => void;
};

export function SupplierListingsAppliedFiltersList({
  appliedFilters,
  removeFilter,
}: SupplierListingsAppliedFiltersListProps) {
  const rows = useMemo(
    () => appliedSupplierListingFilterRows(appliedFilters),
    [appliedFilters],
  );

  return <AppliedFiltersStack rows={rows} onRemove={removeFilter} />;
}
