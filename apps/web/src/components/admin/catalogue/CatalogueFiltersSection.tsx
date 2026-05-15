'use client';

import type { Dispatch, SetStateAction } from 'react';
import { Button } from '@/components/ui/Button';
import { CatalogueAddFilterModal } from './CatalogueAddFilterModal';
import { CatalogueAppliedFiltersList } from './CatalogueAppliedFiltersList';
import type { AppliedFilter } from './catalogue-filter-model';
import type { CatalogueFilterDraft } from './catalogue-filter-validation';

export type CatalogueFiltersSectionProps = {
  filterAddModalOpen: boolean;
  onOpenFilterAddModal: () => void;
  onCloseFilterAddModal: () => void;
  appliedFilters: AppliedFilter[];
  removeFilter: (id: string) => void;
  addFilter: () => boolean;
  filterDraft: CatalogueFilterDraft;
  setFilterDraft: Dispatch<SetStateAction<CatalogueFilterDraft>>;
};

export function CatalogueFiltersSection({
  filterAddModalOpen,
  onOpenFilterAddModal,
  onCloseFilterAddModal,
  appliedFilters,
  removeFilter,
  addFilter,
  filterDraft,
  setFilterDraft,
}: CatalogueFiltersSectionProps) {
  return (
    <div className="flow-root">
      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <div className="overflow-hidden bg-gray-800/50 outline-1 -outline-offset-1 outline-white/10 sm:rounded-lg">
            <div className="divide-y divide-white/10">
              <div className="px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      Applied filters
                    </h2>
                  </div>
                  <Button
                    type="button"
                    onClick={onOpenFilterAddModal}
                    className="shrink-0"
                  >
                    Add filter
                  </Button>
                </div>
              </div>
              <div className="px-4 py-4 sm:px-6 lg:px-8">
                <CatalogueAppliedFiltersList
                  appliedFilters={appliedFilters}
                  removeFilter={removeFilter}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <CatalogueAddFilterModal
        open={filterAddModalOpen}
        onClose={onCloseFilterAddModal}
        addFilter={addFilter}
        filterDraft={filterDraft}
        setFilterDraft={setFilterDraft}
      />
    </div>
  );
}
