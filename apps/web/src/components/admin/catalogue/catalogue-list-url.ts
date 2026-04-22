import { routes } from "@/constants/routes";
import { pathWithoutQueryAndTrailingSlash } from "@/utils/admin-path";
import {
  CATALOGUE_PRODUCTS_DEFAULT_PAGE_SIZE,
  catalogueProductsListQuerySchema,
  type CatalogueProductFilter,
} from "@vetply/shared";
import type { UrlObject } from "url";
import type { AppliedFilter } from "./catalogue-filter-model";
import { appliedFiltersToApiPayload } from "./catalogue-filter-model";
import type { CatalogueSortState } from "./catalogue-sort";

export type CatalogueListUrlState = {
  page: number;
  pageSize: number;
  /** Trimmed product name search (`q` query param); empty means no search. */
  nameSearch: string;
  appliedFilters: AppliedFilter[];
  sort: CatalogueSortState;
};

function firstQueryParam(
  value: string | string[] | undefined,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return Array.isArray(value) ? value[0] : value;
}

function apiFiltersToAppliedFilters(
  filters: CatalogueProductFilter[],
): AppliedFilter[] {
  return filters.map((f, index) => {
    const { id: _omit, ...rest } = f as CatalogueProductFilter & {
      id?: string;
    };
    return {
      ...rest,
      id: `filter-${index}`,
    } as AppliedFilter;
  });
}

export function parseCatalogueListFromQuery(
  query: Record<string, string | string[] | undefined>,
): { ok: true; data: CatalogueListUrlState } | { ok: false } {
  const raw = {
    page: firstQueryParam(query.page),
    pageSize: firstQueryParam(query.pageSize),
    q: firstQueryParam(query.q),
    filters: firstQueryParam(query.filters),
    sort: firstQueryParam(query.sort),
  };
  const parsed = catalogueProductsListQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false };
  }
  const d = parsed.data;
  return {
    ok: true,
    data: {
      page: d.page,
      pageSize: d.pageSize,
      nameSearch: d.q ?? "",
      appliedFilters: d.filters?.length
        ? apiFiltersToAppliedFilters(d.filters)
        : [],
      sort: d.sort ?? null,
    },
  };
}

export function buildCatalogueListUrl(
  basePath: string,
  state: CatalogueListUrlState,
): string {
  const params = new URLSearchParams();
  if (state.page !== 1) {
    params.set("page", String(state.page));
  }
  if (state.pageSize !== CATALOGUE_PRODUCTS_DEFAULT_PAGE_SIZE) {
    params.set("pageSize", String(state.pageSize));
  }
  if (state.nameSearch.trim() !== "") {
    params.set("q", state.nameSearch.trim());
  }
  const payloadFilters = appliedFiltersToApiPayload(state.appliedFilters);
  if (payloadFilters.length > 0) {
    params.set("filters", JSON.stringify(payloadFilters));
  }
  if (state.sort) {
    params.set("sort", JSON.stringify(state.sort));
  }
  const q = params.toString();
  return q ? `${basePath}?${q}` : basePath;
}

export function catalogueListStateEquals(
  a: CatalogueListUrlState,
  b: CatalogueListUrlState,
): boolean {
  if (a.page !== b.page || a.pageSize !== b.pageSize) {
    return false;
  }
  if (a.nameSearch.trim() !== b.nameSearch.trim()) {
    return false;
  }
  if (JSON.stringify(a.sort ?? null) !== JSON.stringify(b.sort ?? null)) {
    return false;
  }
  return (
    JSON.stringify(appliedFiltersToApiPayload(a.appliedFilters)) ===
    JSON.stringify(appliedFiltersToApiPayload(b.appliedFilters))
  );
}

/** `pages/admin/[[...slug]].tsx` — the dynamic route that covers all admin paths. */
const ADMIN_CATALOGUE_PAGE_ROUTE = "/admin/[[...slug]]";

/**
 * Builds the object-form navigation args needed by Next.js Pages Router for the
 * `[[...slug]]` dynamic route.  A plain string URL can drop search params for this route.
 */
export function buildCatalogueListDynamicRouteNavigation(
  href: string,
  baseOrigin: string,
): { url: UrlObject; as: string } | null {
  const origin = baseOrigin.replace(/\/$/, "");
  const resolved = href.startsWith("http")
    ? href
    : `${origin}${href.startsWith("/") ? "" : "/"}${href}`;
  let u: URL;
  try {
    u = new URL(resolved);
  } catch {
    return null;
  }
  const pathOnly = pathWithoutQueryAndTrailingSlash(u.pathname);
  if (pathOnly !== routes.admin.catalogue.view) {
    return null;
  }
  const query: Record<string, string | string[]> = {};
  u.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  query.slug = ["catalogue"];
  return {
    url: {
      pathname: ADMIN_CATALOGUE_PAGE_ROUTE,
      query,
    },
    as: `${u.pathname}${u.search}`,
  };
}
