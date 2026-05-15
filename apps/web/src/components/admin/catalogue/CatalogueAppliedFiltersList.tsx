'use client';

import { AppliedFiltersStack } from '@/components/ui/filters/AppliedFiltersStack';
import { useMemo } from 'react';
import { formatAppliedFilterDisplayParts } from './catalogue-filter-model';
import type { AppliedFilter } from './catalogue-filter-model';

export type CatalogueAppliedFiltersListProps = {
  appliedFilters: AppliedFilter[];
  removeFilter: (id: string) => void;
};

export function CatalogueAppliedFiltersList({
  appliedFilters,
  removeFilter,
}: CatalogueAppliedFiltersListProps) {
  const rows = useMemo(
    () =>
      appliedFilters.map((f) => ({
        id: f.id,
        ...formatAppliedFilterDisplayParts(f),
      })),
    [appliedFilters],
  );

  return <AppliedFiltersStack rows={rows} onRemove={removeFilter} />;
}
