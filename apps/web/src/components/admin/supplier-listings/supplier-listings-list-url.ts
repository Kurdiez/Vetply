import { routes } from '@/constants/routes';
import { pathWithoutQueryAndTrailingSlash } from '@/utils/admin-path';
import {
  CATALOGUE_SUPPLIER_LISTINGS_DEFAULT_PAGE_SIZE,
  catalogueSupplierListingsQuerySchema,
  type SupplierListingFilter,
} from '@vetply/shared';
import type { UrlObject } from 'url';
import type { SupplierListingSortState } from './supplier-listing-sort';
import type { AppliedSupplierListingFilter } from './supplier-listing-filter-model';
import { appliedSupplierListingFiltersToApiPayload } from './supplier-listing-filter-model';

export type SupplierListingsListUrlState = {
  page: number;
  pageSize: number;
  nameSearch: string;
  appliedFilters: AppliedSupplierListingFilter[];
  sort: SupplierListingSortState;
};

function firstQueryParam(
  value: string | string[] | undefined,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return Array.isArray(value) ? value[0] : value;
}

function apiFiltersToApplied(
  filters: SupplierListingFilter[],
): AppliedSupplierListingFilter[] {
  return filters.map((f, index) => {
    const withId = f as SupplierListingFilter & { id?: string };
    const { id: _omit, ...rest } = withId;
    return {
      ...rest,
      id: `filter-${index}`,
    } as AppliedSupplierListingFilter;
  });
}

export function parseSupplierListingsListFromQuery(
  query: Record<string, string | string[] | undefined>,
): { ok: true; data: SupplierListingsListUrlState } | { ok: false } {
  const raw = {
    page: firstQueryParam(query.page),
    pageSize: firstQueryParam(query.pageSize),
    q: firstQueryParam(query.q),
    filters: firstQueryParam(query.filters),
    sort: firstQueryParam(query.sort),
  };
  const parsed = catalogueSupplierListingsQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false };
  }
  const d = parsed.data;
  return {
    ok: true,
    data: {
      page: d.page,
      pageSize: d.pageSize,
      nameSearch: d.q ?? '',
      appliedFilters: d.filters?.length ? apiFiltersToApplied(d.filters) : [],
      sort: d.sort ?? null,
    },
  };
}

export function buildSupplierListingsListUrl(
  basePath: string,
  state: SupplierListingsListUrlState,
): string {
  const params = new URLSearchParams();
  if (state.page !== 1) {
    params.set('page', String(state.page));
  }
  if (state.pageSize !== CATALOGUE_SUPPLIER_LISTINGS_DEFAULT_PAGE_SIZE) {
    params.set('pageSize', String(state.pageSize));
  }
  if (state.nameSearch.trim() !== '') {
    params.set('q', state.nameSearch.trim());
  }
  const payloadFilters = appliedSupplierListingFiltersToApiPayload(
    state.appliedFilters,
  );
  if (payloadFilters.length > 0) {
    params.set('filters', JSON.stringify(payloadFilters));
  }
  if (state.sort) {
    params.set('sort', JSON.stringify(state.sort));
  }
  const q = params.toString();
  return q ? `${basePath}?${q}` : basePath;
}

export function supplierListingsListStateEquals(
  a: SupplierListingsListUrlState,
  b: SupplierListingsListUrlState,
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
    JSON.stringify(
      appliedSupplierListingFiltersToApiPayload(a.appliedFilters),
    ) ===
    JSON.stringify(appliedSupplierListingFiltersToApiPayload(b.appliedFilters))
  );
}

const ADMIN_PAGE_ROUTE = '/admin/[[...slug]]';

export function buildSupplierListingsListDynamicRouteNavigation(
  href: string,
  baseOrigin: string,
): { url: UrlObject; as: string } | null {
  const origin = baseOrigin.replace(/\/$/, '');
  const resolved = href.startsWith('http')
    ? href
    : `${origin}${href.startsWith('/') ? '' : '/'}${href}`;
  let u: URL;
  try {
    u = new URL(resolved);
  } catch {
    return null;
  }
  const pathOnly = pathWithoutQueryAndTrailingSlash(u.pathname);
  if (pathOnly !== routes.admin.catalogue.supplierListings) {
    return null;
  }
  const query: Record<string, string | string[]> = {};
  u.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  query.slug = ['catalogue', 'supplier-listings'];
  return {
    url: {
      pathname: ADMIN_PAGE_ROUTE,
      query,
    },
    as: `${u.pathname}${u.search}`,
  };
}
