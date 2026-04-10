"use client";

import { AppliedFiltersStack } from "@/components/ui/filters/AppliedFiltersStack";
import { useMemo } from "react";
import { formatAppliedFilterDisplayParts } from "./catalogue-filter-model";
import { useCatalogueView } from "./CatalogueViewContext";

export function CatalogueAppliedFiltersList() {
  const { appliedFilters, removeFilter } = useCatalogueView();

  const rows = useMemo(
    () =>
      appliedFilters.map((f) => ({
        id: f.id,
        ...formatAppliedFilterDisplayParts(f),
      })),
    [appliedFilters],
  );

  return (
    <AppliedFiltersStack rows={rows} onRemove={removeFilter} />
  );
}
