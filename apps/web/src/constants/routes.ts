export const routes = {
  home: "/",
  signIn: "/sign-in",
  signUp: "/sign-up",
  app: "/app",
  admin: {
    root: "/admin",
    catalogue: {
      view: "/admin/catalogue",
      importSupplierPrices: "/admin/catalogue/import-supplier-prices",
    },
  },
} as const;

export function isValidAdminPath(path: string): boolean {
  return (
    path === routes.admin.root ||
    path === routes.admin.catalogue.view ||
    path === routes.admin.catalogue.importSupplierPrices
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
