export const routes = {
  home: '/',
  signIn: '/sign-in',
  signUp: '/sign-up',
  app: '/app',
  admin: {
    root: '/admin',
    catalogue: {
      view: '/admin/catalogue',
      supplierListings: '/admin/catalogue/supplier-listings',
      importSupplierPrices: '/admin/catalogue/import-supplier-prices',
      productDetail: (productId: string) =>
        `/admin/catalogue/product/${productId}`,
    },
  },
} as const;

const CATALOGUE_PRODUCT_DETAIL_PREFIX = `${routes.admin.catalogue.view}/product/`;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns product id when `path` is a valid catalogue product detail URL. */
export function parseCatalogueProductDetailId(path: string): string | null {
  if (!path.startsWith(CATALOGUE_PRODUCT_DETAIL_PREFIX)) {
    return null;
  }
  const id = path.slice(CATALOGUE_PRODUCT_DETAIL_PREFIX.length);
  return UUID_RE.test(id) ? id : null;
}

export function isValidAdminPath(path: string): boolean {
  return (
    path === routes.admin.root ||
    path === routes.admin.catalogue.view ||
    path === routes.admin.catalogue.supplierListings ||
    path === routes.admin.catalogue.importSupplierPrices ||
    parseCatalogueProductDetailId(path) !== null
  );
}

export function isAppRoutePath(pathname: string): boolean {
  return pathname === routes.app || pathname.startsWith(`${routes.app}/`);
}

export function isAdminRoutePath(pathname: string): boolean {
  return (
    pathname === routes.admin.root ||
    pathname.startsWith(`${routes.admin.root}/`)
  );
}

export function isUnderAdminCatalogue(pathname: string): boolean {
  return (
    pathname === routes.admin.catalogue.view ||
    pathname.startsWith(`${routes.admin.catalogue.view}/`)
  );
}
