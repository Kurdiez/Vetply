'use client';

import { AdminListPageHeader } from '@/components/admin/list/AdminListPageHeader';
import { AdminListStack } from '@/components/admin/list/AdminListStack';
import { Button } from '@/components/ui/Button';
import { routes } from '@/constants/routes';
import { CatalogueNameSearch } from './CatalogueNameSearch';
import { CatalogueFiltersSection } from './CatalogueFiltersSection';
import { CatalogueSelectionSummary } from './CatalogueSelectionSummary';
import { CatalogueProductsPagination } from './CatalogueProductsPagination';
import { CatalogueProductsTable } from './CatalogueProductsTable';
import { CatalogueAddProductButton } from './CatalogueAddProductButton';
import { CatalogueViewProvider } from './CatalogueViewContext';

export function CatalogueViewPage() {
  return (
    <CatalogueViewProvider>
      <div>
        <AdminListPageHeader
          title="Catalogue"
          description={
            <>
              Supplier-agnostic product records from imports. Prices and
              variants are not shown here.
            </>
          }
          actions={
            <>
              <CatalogueAddProductButton />
              <Button
                href={routes.admin.catalogue.importSupplierPrices}
                className="block text-center sm:inline-flex"
              >
                Import supplier price files
              </Button>
            </>
          }
        />
        <AdminListStack>
          <CatalogueNameSearch />
          <CatalogueFiltersSection />
          <CatalogueSelectionSummary />
          <CatalogueProductsTable />
          <CatalogueProductsPagination />
        </AdminListStack>
      </div>
    </CatalogueViewProvider>
  );
}
