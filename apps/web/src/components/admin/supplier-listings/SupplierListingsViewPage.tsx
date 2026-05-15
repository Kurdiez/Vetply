'use client';

import { AdminListPageHeader } from '@/components/admin/list/AdminListPageHeader';
import { AdminListStack } from '@/components/admin/list/AdminListStack';
import { Button } from '@/components/ui/Button';
import { routes } from '@/constants/routes';
import { LinkSupplierListingsToCatalogueProductModal } from './LinkSupplierListingsToCatalogueProductModal';
import { SupplierListingsFiltersSection } from './SupplierListingsFiltersSection';
import { SupplierListingsPagination } from './SupplierListingsPagination';
import { SupplierListingsSearch } from './SupplierListingsSearch';
import { SupplierListingsSelectionSummary } from './SupplierListingsSelectionSummary';
import { SupplierListingsTable } from './SupplierListingsTable';
import {
  SupplierListingsViewProvider,
  useSupplierListingsView,
} from './SupplierListingsViewContext';

function SupplierListingsViewPageBody() {
  const s = useSupplierListingsView();

  return (
    <>
      <div>
        <AdminListPageHeader
          title="Supplier listings"
          description={
            <>
              Rows from supplier imports. Catalogue product names reflect
              associations with catalogue products when listings are linked.
            </>
          }
          actions={
            <Button
              href={routes.admin.catalogue.importSupplierPrices}
              className="block text-center sm:inline-flex"
            >
              Import supplier listing files
            </Button>
          }
        />
        <AdminListStack>
          <SupplierListingsSearch
            searchInput={s.searchInput}
            setSearchInput={s.setSearchInput}
          />
          <SupplierListingsFiltersSection
            filterAddModalOpen={s.filterAddModalOpen}
            onOpenFilterAddModal={s.openFilterAddModal}
            onCloseFilterAddModal={s.closeFilterAddModal}
            appliedFilters={s.appliedFilters}
            removeFilter={s.removeFilter}
            addFilter={s.addFilter}
            filterDraft={s.filterDraft}
            setFilterDraft={s.setFilterDraft}
          />
          <SupplierListingsSelectionSummary
            selectedListingCount={s.selectedListingCount}
            clearListingSelection={s.clearListingSelection}
            onOpenLinkModal={s.openLinkListingsModal}
            unlinkSelectedListingsFromCatalogueProduct={
              s.unlinkSelectedListingsFromCatalogueProduct
            }
          />
          <SupplierListingsTable
            items={s.items}
            status={s.status}
            refetch={s.refetch}
            sort={s.sort}
            toggleSortColumn={s.toggleSortColumn}
            toggleListingSelection={s.toggleListingSelection}
            isListingSelected={s.isListingSelected}
          />
          <SupplierListingsPagination
            page={s.page}
            pageSize={s.pageSize}
            totalCount={s.totalCount}
            setPage={s.setPage}
            status={s.status}
          />
        </AdminListStack>
      </div>
      <LinkSupplierListingsToCatalogueProductModal
        open={s.linkListingsModalOpen}
        onClose={s.closeLinkListingsModal}
        searchCatalogueProductsForPicker={s.searchCatalogueProductsForPicker}
        linkSelectedListingsToProduct={s.linkSelectedListingsToProduct}
        selectedListingCount={s.selectedListingCount}
      />
    </>
  );
}

export function SupplierListingsViewPage() {
  return (
    <SupplierListingsViewProvider>
      <SupplierListingsViewPageBody />
    </SupplierListingsViewProvider>
  );
}
