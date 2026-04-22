"use client";

import { Button } from "@/components/ui/Button";
import { routes } from "@/constants/routes";
import { CatalogueNameSearch } from "./CatalogueNameSearch";
import { CatalogueFiltersSection } from "./CatalogueFiltersSection";
import { CatalogueProductsPagination } from "./CatalogueProductsPagination";
import { CatalogueProductsTable } from "./CatalogueProductsTable";
import { CatalogueViewProvider } from "./CatalogueViewContext";

export function CatalogueViewPage() {
  return (
    <CatalogueViewProvider>
      <div>
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-base font-semibold text-white">Catalogue</h1>
            <p className="mt-2 text-sm text-gray-300">
              Supplier-agnostic product records from imports. Prices and variants
              are not shown here.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <Button
              href={routes.admin.catalogue.importSupplierPrices}
              className="block text-center sm:inline-flex"
            >
              Import supplier prices
            </Button>
          </div>
        </div>
        <div className="mt-8 space-y-6">
          <CatalogueNameSearch />
          <CatalogueFiltersSection />
          <CatalogueProductsTable />
          <CatalogueProductsPagination />
        </div>
      </div>
    </CatalogueViewProvider>
  );
}
