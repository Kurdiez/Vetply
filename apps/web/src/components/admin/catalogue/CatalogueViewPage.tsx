'use client';

import { AdminListPageHeader } from '@/components/admin/list/AdminListPageHeader';
import { AdminListStack } from '@/components/admin/list/AdminListStack';
import { Button } from '@/components/ui/Button';
import { routes } from '@/constants/routes';
import { CatalogueAddProductButton } from './CatalogueAddProductButton';
import { CatalogueFiltersSection } from './CatalogueFiltersSection';
import { CatalogueNameSearch } from './CatalogueNameSearch';
import { CatalogueProductsPagination } from './CatalogueProductsPagination';
import { CatalogueProductsTable } from './CatalogueProductsTable';
import { CatalogueSelectionSummary } from './CatalogueSelectionSummary';
import {
  CatalogueViewProvider,
  useCatalogueView,
} from './CatalogueViewContext';

function CatalogueViewPageBody() {
  const c = useCatalogueView();

  return (
    <div>
      <AdminListPageHeader
        title="Catalogue"
        description={
          <>
            Supplier-agnostic product records from imports. Prices and variants
            are not shown here.
          </>
        }
        actions={
          <>
            <CatalogueAddProductButton
              onNavigateToProduct={c.navigateToProduct}
            />
            <Button
              href={routes.admin.catalogue.importSupplierPrices}
              className="block text-center sm:inline-flex"
            >
              Import supplier listing files
            </Button>
          </>
        }
      />
      <AdminListStack>
        <CatalogueNameSearch
          searchInput={c.searchInput}
          setSearchInput={c.setSearchInput}
        />
        <CatalogueFiltersSection
          filterAddModalOpen={c.filterAddModalOpen}
          onOpenFilterAddModal={c.openFilterAddModal}
          onCloseFilterAddModal={c.closeFilterAddModal}
          appliedFilters={c.appliedFilters}
          removeFilter={c.removeFilter}
          addFilter={c.addFilter}
          filterDraft={c.filterDraft}
          setFilterDraft={c.setFilterDraft}
        />
        <CatalogueSelectionSummary
          selectedProductCount={c.selectedProductCount}
          clearProductSelection={c.clearProductSelection}
          bulkDeleteConfirmOpen={c.bulkDeleteConfirmOpen}
          openBulkDeleteConfirm={c.openBulkDeleteConfirm}
          closeBulkDeleteConfirm={c.closeBulkDeleteConfirm}
          confirmBulkDelete={c.confirmBulkDelete}
        />
        <CatalogueProductsTable
          items={c.items}
          status={c.status}
          refetch={c.refetch}
          sort={c.sort}
          toggleSortColumn={c.toggleSortColumn}
          navigateToProduct={c.navigateToProduct}
          toggleProductSelection={c.toggleProductSelection}
          isProductSelected={c.isProductSelected}
        />
        <CatalogueProductsPagination
          page={c.page}
          pageSize={c.pageSize}
          totalCount={c.totalCount}
          setPage={c.setPage}
          status={c.status}
        />
      </AdminListStack>
    </div>
  );
}

export function CatalogueViewPage() {
  return (
    <CatalogueViewProvider>
      <CatalogueViewPageBody />
    </CatalogueViewProvider>
  );
}
