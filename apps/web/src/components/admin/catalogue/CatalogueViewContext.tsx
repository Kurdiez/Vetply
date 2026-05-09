'use client';

import { routes } from '@/constants/routes';
import { pathWithoutQueryAndTrailingSlash } from '@/utils/admin-path';
import { isNextRouterAsPathInSyncWithBrowser } from '@/utils/next-router-location';
import { useSelectedRowIds } from '@/hooks/use-selected-row-ids';
import {
  fetchCatalogueProducts,
  postBulkDeleteCatalogueProducts,
} from '@/utils/vetply-api/catalogue-api';
import {
  CATALOGUE_PRODUCTS_DEFAULT_PAGE_SIZE,
  type CatalogueProductListItem,
} from '@vetply/shared';
import { useRouter } from 'next/router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { toast } from 'sonner';
import type {
  AppliedFilter,
  CatalogueSortFieldId,
} from './catalogue-filter-model';
import {
  appliedFiltersToApiPayload,
  logCatalogueListRequestPayload,
} from './catalogue-filter-model';
import {
  createEmptyDraft,
  validateDraftAndBuildFilter,
  type CatalogueFilterDraft,
} from './catalogue-filter-validation';
import {
  buildCatalogueListDynamicRouteNavigation,
  buildCatalogueListUrl,
  buildCatalogueProductDetailNavigation,
  catalogueListStateEquals,
  parseCatalogueListFromQuery,
  type CatalogueListUrlState,
} from './catalogue-list-url';
import type { CatalogueSortState } from './catalogue-sort';
import { nextSortState } from './catalogue-sort';

type CatalogueViewStatus = 'idle' | 'loading' | 'ready' | 'error';

type CatalogueViewContextValue = {
  page: number;
  pageSize: number;
  items: CatalogueProductListItem[];
  totalCount: number;
  status: CatalogueViewStatus;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  refetch: () => void;
  sort: CatalogueSortState;
  toggleSortColumn: (fieldId: CatalogueSortFieldId) => void;
  appliedFilters: AppliedFilter[];
  filterDraft: CatalogueFilterDraft;
  setFilterDraft: Dispatch<SetStateAction<CatalogueFilterDraft>>;
  addFilter: () => boolean;
  removeFilter: (id: string) => void;
  /** Controlled input for product name search (debounced to URL and API). */
  searchInput: string;
  setSearchInput: Dispatch<SetStateAction<string>>;
  navigateToProduct: (productId: string) => void;
  /** IDs selected for bulk actions; persists across catalogue list pages. */
  selectedProductIds: ReadonlySet<string>;
  selectedProductCount: number;
  toggleProductSelection: (productId: string) => void;
  setProductSelection: (productId: string, selected: boolean) => void;
  clearProductSelection: () => void;
  isProductSelected: (productId: string) => boolean;
  /** Returns true when the API delete succeeded. */
  bulkDeleteSelectedProducts: () => Promise<boolean>;
};

const CatalogueViewContext = createContext<CatalogueViewContextValue | null>(
  null,
);

function toListState(
  page: number,
  pageSize: number,
  nameSearch: string,
  appliedFilters: AppliedFilter[],
  sort: CatalogueSortState,
): CatalogueListUrlState {
  return { page, pageSize, nameSearch, appliedFilters, sort };
}

export function CatalogueViewProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [hydratedFromUrl, setHydratedFromUrl] = useState(false);
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(
    CATALOGUE_PRODUCTS_DEFAULT_PAGE_SIZE,
  );
  const [fetchedItems, setFetchedItems] = useState<CatalogueProductListItem[]>(
    [],
  );
  const [totalCount, setTotalCount] = useState(0);
  const [status, setStatus] = useState<CatalogueViewStatus>('idle');
  const [fetchTick, setFetchTick] = useState(0);
  const [sort, setSort] = useState<CatalogueSortState>(null);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilter[]>([]);
  const [filterDraft, setFilterDraft] = useState<CatalogueFilterDraft>(() =>
    createEmptyDraft(),
  );
  const [searchInput, setSearchInput] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const searchCommitRef = useRef('');

  const {
    selectedIds: selectedProductIds,
    selectedCount: selectedProductCount,
    toggleSelected: toggleProductSelection,
    setSelected: setProductSelection,
    clearSelection: clearProductSelection,
    isSelected: isProductSelected,
  } = useSelectedRowIds();

  const stateRef = useRef(
    toListState(1, CATALOGUE_PRODUCTS_DEFAULT_PAGE_SIZE, '', [], null),
  );
  useEffect(() => {
    stateRef.current = toListState(
      page,
      pageSize,
      nameSearch,
      appliedFilters,
      sort,
    );
  }, [page, pageSize, nameSearch, appliedFilters, sort]);

  /**
   * Hydration: URL → state.
   * Only runs when router.asPath is in sync with window.location, ensuring we parse
   * the real address bar params and not a transitional router snapshot.
   */
  useEffect(() => {
    if (!router.isReady) {
      return;
    }
    const path = pathWithoutQueryAndTrailingSlash(router.asPath);
    if (path !== routes.admin.catalogue.view) {
      return;
    }
    if (!isNextRouterAsPathInSyncWithBrowser(router.asPath)) {
      return;
    }

    const parsed = parseCatalogueListFromQuery(router.query);
    if (!parsed.ok) {
      setPageState(1);
      setPageSizeState(CATALOGUE_PRODUCTS_DEFAULT_PAGE_SIZE);
      setAppliedFilters([]);
      setSort(null);
      searchCommitRef.current = '';
      setSearchInput('');
      setNameSearch('');
      setHydratedFromUrl(true);
      return;
    }

    const next = parsed.data;
    if (catalogueListStateEquals(next, stateRef.current)) {
      setHydratedFromUrl(true);
      return;
    }

    setPageState(next.page);
    setPageSizeState(next.pageSize);
    setAppliedFilters(next.appliedFilters);
    setSort(next.sort);
    const q = next.nameSearch;
    searchCommitRef.current = q;
    setSearchInput(q);
    setNameSearch(q);
    setHydratedFromUrl(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate only when isReady+asPath gate passes; omitting router.query avoids redundant runs (see block comment above).
  }, [router.isReady, router.asPath]);

  /**
   * URL push helper called directly by user-action callbacks.
   * The URL is ONLY updated from explicit user actions — never from a reactive state effect —
   * to avoid racing with the hydration effect above.
   */
  const pushListUrl = useCallback(
    (state: CatalogueListUrlState) => {
      const url = buildCatalogueListUrl(routes.admin.catalogue.view, state);
      const nav = buildCatalogueListDynamicRouteNavigation(
        url,
        window.location.origin,
      );
      if (nav) {
        void router.push(nav.url, nav.as, { shallow: true });
      } else {
        void router.push(url, undefined, { shallow: true });
      }
    },
    [router],
  );

  const navigateToProduct = useCallback(
    (productId: string) => {
      const nav = buildCatalogueProductDetailNavigation(productId);
      void router.push(nav.url, nav.as, { shallow: true });
    },
    [router],
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = searchInput.trim();
      if (next === searchCommitRef.current) {
        return;
      }
      searchCommitRef.current = next;
      setNameSearch(next);
      setPageState(1);
      pushListUrl({
        page: 1,
        pageSize,
        appliedFilters,
        sort,
        nameSearch: next,
      });
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput, pageSize, appliedFilters, sort, pushListUrl]);

  const setPage = useCallback(
    (nextPage: number) => {
      const n = Math.max(1, nextPage);
      setPageState(n);
      pushListUrl({
        page: n,
        pageSize,
        nameSearch,
        appliedFilters,
        sort,
      });
    },
    [pushListUrl, pageSize, nameSearch, appliedFilters, sort],
  );

  const setPageSize = useCallback(
    (size: number) => {
      setPageSizeState(size);
      setPageState(1);
      pushListUrl({
        page: 1,
        pageSize: size,
        nameSearch,
        appliedFilters,
        sort,
      });
    },
    [pushListUrl, nameSearch, appliedFilters, sort],
  );

  const refetch = useCallback(() => {
    setFetchTick((tick) => tick + 1);
  }, []);

  const bulkDeleteSelectedProducts = useCallback(async (): Promise<boolean> => {
    if (selectedProductCount === 0) {
      return false;
    }
    try {
      await postBulkDeleteCatalogueProducts({
        productIds: [...selectedProductIds],
      });
      clearProductSelection();
      refetch();
      return true;
    } catch {
      toast.error('Could not delete products.');
      return false;
    }
  }, [
    selectedProductCount,
    selectedProductIds,
    clearProductSelection,
    refetch,
  ]);

  const toggleSortColumn = useCallback(
    (fieldId: CatalogueSortFieldId) => {
      const newSort = nextSortState(sort, fieldId);
      setSort(newSort);
      pushListUrl({
        page,
        pageSize,
        nameSearch,
        appliedFilters,
        sort: newSort,
      });
    },
    [pushListUrl, sort, page, pageSize, nameSearch, appliedFilters],
  );

  const addFilter = useCallback((): boolean => {
    const result = validateDraftAndBuildFilter(filterDraft, () =>
      crypto.randomUUID(),
    );
    if (!result.ok) {
      toast.error(result.message);
      return false;
    }
    const newFilters = [...appliedFilters, result.filter];
    logCatalogueListRequestPayload({
      page: 1,
      pageSize,
      sort,
      filters: newFilters,
    });
    setAppliedFilters(newFilters);
    setPageState(1);
    setFilterDraft(createEmptyDraft());
    pushListUrl({
      page: 1,
      pageSize,
      nameSearch,
      appliedFilters: newFilters,
      sort,
    });
    return true;
  }, [filterDraft, pageSize, sort, appliedFilters, nameSearch, pushListUrl]);

  const removeFilter = useCallback(
    (id: string) => {
      const newFilters = appliedFilters.filter((f) => f.id !== id);
      setAppliedFilters(newFilters);
      setPageState(1);
      pushListUrl({
        page: 1,
        pageSize,
        nameSearch,
        appliedFilters: newFilters,
        sort,
      });
    },
    [appliedFilters, pageSize, sort, nameSearch, pushListUrl],
  );

  useEffect(() => {
    if (status !== 'ready') {
      return;
    }
    const maxPage = Math.max(1, Math.ceil(totalCount / pageSize));
    if (page > maxPage) {
      const clamped = maxPage;
      setPageState(clamped);
      pushListUrl({
        page: clamped,
        pageSize,
        nameSearch,
        appliedFilters,
        sort,
      });
    }
  }, [
    status,
    totalCount,
    pageSize,
    page,
    pushListUrl,
    appliedFilters,
    sort,
    nameSearch,
  ]);

  useEffect(() => {
    if (!hydratedFromUrl) {
      return;
    }
    let cancelled = false;

    async function run() {
      setStatus('loading');
      try {
        const res = await fetchCatalogueProducts({
          page,
          pageSize,
          q: nameSearch || undefined,
          filters: appliedFiltersToApiPayload(appliedFilters),
          sort: sort ?? undefined,
        });
        if (cancelled) {
          return;
        }
        setFetchedItems(res.items);
        setTotalCount(res.totalCount);
        setStatus('ready');
      } catch {
        if (cancelled) {
          return;
        }
        setStatus('error');
        toast.error('Could not load catalogue.');
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    page,
    pageSize,
    fetchTick,
    appliedFilters,
    sort,
    nameSearch,
    hydratedFromUrl,
  ]);

  const value = useMemo<CatalogueViewContextValue>(
    () => ({
      page,
      pageSize,
      items: fetchedItems,
      totalCount,
      status,
      setPage,
      setPageSize,
      refetch,
      sort,
      toggleSortColumn,
      appliedFilters,
      filterDraft,
      setFilterDraft,
      addFilter,
      removeFilter,
      searchInput,
      setSearchInput,
      navigateToProduct,
      selectedProductIds,
      selectedProductCount,
      toggleProductSelection,
      setProductSelection,
      clearProductSelection,
      isProductSelected,
      bulkDeleteSelectedProducts,
    }),
    [
      page,
      pageSize,
      fetchedItems,
      totalCount,
      status,
      setPage,
      setPageSize,
      refetch,
      sort,
      toggleSortColumn,
      appliedFilters,
      filterDraft,
      addFilter,
      removeFilter,
      searchInput,
      navigateToProduct,
      selectedProductIds,
      selectedProductCount,
      toggleProductSelection,
      setProductSelection,
      clearProductSelection,
      isProductSelected,
      bulkDeleteSelectedProducts,
    ],
  );

  return (
    <CatalogueViewContext.Provider value={value}>
      {children}
    </CatalogueViewContext.Provider>
  );
}

export function useCatalogueView(): CatalogueViewContextValue {
  const ctx = useContext(CatalogueViewContext);
  if (!ctx) {
    throw new Error(
      'useCatalogueView must be used within CatalogueViewProvider',
    );
  }
  return ctx;
}
