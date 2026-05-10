'use client';

import { AppliedFiltersStack } from '@/components/ui/filters/AppliedFiltersStack';
import { useMemo } from 'react';
import { appliedSupplierListingFilterRows } from './supplier-listing-filter-model';
import { useSupplierListingsView } from './SupplierListingsViewContext';

export function SupplierListingsAppliedFiltersList() {
  const { appliedFilters, removeFilter } = useSupplierListingsView();

  const rows = useMemo(
    () => appliedSupplierListingFilterRows(appliedFilters),
    [appliedFilters],
  );

  return <AppliedFiltersStack rows={rows} onRemove={removeFilter} />;
}
