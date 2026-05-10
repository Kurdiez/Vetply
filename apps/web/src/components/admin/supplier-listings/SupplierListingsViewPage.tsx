'use client';

import { AdminListPageHeader } from '@/components/admin/list/AdminListPageHeader';
import { AdminListStack } from '@/components/admin/list/AdminListStack';
import { Button } from '@/components/ui/Button';
import { routes } from '@/constants/routes';
import { useState } from 'react';
import { LinkSupplierListingsToCatalogueProductModal } from './LinkSupplierListingsToCatalogueProductModal';
import { SupplierListingsFiltersSection } from './SupplierListingsFiltersSection';
import { SupplierListingsPagination } from './SupplierListingsPagination';
import { SupplierListingsSearch } from './SupplierListingsSearch';
import { SupplierListingsSelectionSummary } from './SupplierListingsSelectionSummary';
import { SupplierListingsTable } from './SupplierListingsTable';
import { SupplierListingsViewProvider } from './SupplierListingsViewContext';

function SupplierListingsViewPageInner() {
  const [linkModalOpen, setLinkModalOpen] = useState(false);

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
              Import supplier listings
            </Button>
          }
        />
        <AdminListStack>
          <SupplierListingsSearch />
          <SupplierListingsFiltersSection />
          <SupplierListingsSelectionSummary
            onOpenLinkModal={() => setLinkModalOpen(true)}
          />
          <SupplierListingsTable />
          <SupplierListingsPagination />
        </AdminListStack>
      </div>
      <LinkSupplierListingsToCatalogueProductModal
        open={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
      />
    </>
  );
}

export function SupplierListingsViewPage() {
  return (
    <SupplierListingsViewProvider>
      <SupplierListingsViewPageInner />
    </SupplierListingsViewProvider>
  );
}
