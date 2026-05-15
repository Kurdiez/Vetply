'use client';

import type { Dispatch, SetStateAction } from 'react';
import { Button } from '@/components/ui/Button';
import { SupplierListingsAddFilterModal } from './SupplierListingsAddFilterModal';
import { SupplierListingsAppliedFiltersList } from './SupplierListingsAppliedFiltersList';
import type { AppliedSupplierListingFilter } from './supplier-listing-filter-model';
import type { SupplierListingsFilterDraft } from './supplier-listing-filter-validation';

export type SupplierListingsFiltersSectionProps = {
  filterAddModalOpen: boolean;
  onOpenFilterAddModal: () => void;
  onCloseFilterAddModal: () => void;
  appliedFilters: AppliedSupplierListingFilter[];
  removeFilter: (id: string) => void;
  addFilter: () => boolean;
  filterDraft: SupplierListingsFilterDraft;
  setFilterDraft: Dispatch<SetStateAction<SupplierListingsFilterDraft>>;
};

export function SupplierListingsFiltersSection({
  filterAddModalOpen,
  onOpenFilterAddModal,
  onCloseFilterAddModal,
  appliedFilters,
  removeFilter,
  addFilter,
  filterDraft,
  setFilterDraft,
}: SupplierListingsFiltersSectionProps) {
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
                <SupplierListingsAppliedFiltersList
                  appliedFilters={appliedFilters}
                  removeFilter={removeFilter}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <SupplierListingsAddFilterModal
        open={filterAddModalOpen}
        onClose={onCloseFilterAddModal}
        addFilter={addFilter}
        filterDraft={filterDraft}
        setFilterDraft={setFilterDraft}
      />
    </div>
  );
}
