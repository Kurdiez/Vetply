'use client';

import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import { SupplierListingsAddFilterModal } from './SupplierListingsAddFilterModal';
import { SupplierListingsAppliedFiltersList } from './SupplierListingsAppliedFiltersList';

export function SupplierListingsFiltersSection() {
  const [addModalOpen, setAddModalOpen] = useState(false);

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
                    onClick={() => setAddModalOpen(true)}
                    className="shrink-0"
                  >
                    Add filter
                  </Button>
                </div>
              </div>
              <div className="px-4 py-4 sm:px-6 lg:px-8">
                <SupplierListingsAppliedFiltersList />
              </div>
            </div>
          </div>
        </div>
      </div>
      <SupplierListingsAddFilterModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
      />
    </div>
  );
}
