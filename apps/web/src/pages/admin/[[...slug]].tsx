"use client";

import { AdminGate } from "@/components/admin/AdminGate";
import { CatalogueProductDetailPage } from "@/components/admin/catalogue/CatalogueProductDetailPage";
import { CatalogueViewPage } from "@/components/admin/catalogue/CatalogueViewPage";
import { ImportSupplierPricesPage } from "@/components/admin/catalogue/ImportSupplierPricesPage";
import {
  isValidAdminPath,
  parseCatalogueProductDetailId,
  routes,
} from "@/constants/routes";
import { pathWithoutQueryAndTrailingSlash } from "@/utils/admin-path";
import { useRouter } from "next/router";
import { useEffect } from "react";

function AdminMain() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) {
      return;
    }
    const path = pathWithoutQueryAndTrailingSlash(router.asPath);
    if (!isValidAdminPath(path)) {
      void router.replace(routes.admin.root);
    }
  }, [router.isReady, router.asPath, router]);

  if (!router.isReady) {
    return null;
  }

  const path = pathWithoutQueryAndTrailingSlash(router.asPath);
  if (!isValidAdminPath(path)) {
    return null;
  }

  if (path === routes.admin.catalogue.importSupplierPrices) {
    return <ImportSupplierPricesPage />;
  }

  const catalogueProductId = parseCatalogueProductDetailId(path);
  if (catalogueProductId) {
    return <CatalogueProductDetailPage productId={catalogueProductId} />;
  }

  if (path === routes.admin.catalogue.view) {
    return <CatalogueViewPage />;
  }

  return null;
}

export default function AdminPage() {
  return (
    <AdminGate>
      <AdminMain />
    </AdminGate>
  );
}
