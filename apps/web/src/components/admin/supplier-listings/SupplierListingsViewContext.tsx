'use client';

import { routes } from '@/constants/routes';
import { pathWithoutQueryAndTrailingSlash } from '@/utils/admin-path';
import { isNextRouterAsPathInSyncWithBrowser } from '@/utils/next-router-location';
import { useSelectedRowIds } from '@/hooks/use-selected-row-ids';
import {
  fetchCatalogueProductPicker,
  fetchCatalogueSupplierListings,
  postBulkUnlinkSupplierListings,
  postLinkSupplierListingsToProduct,
} from '@/utils/vetply-api/catalogue-api';
import {
  CATALOGUE_SUPPLIER_LISTINGS_DEFAULT_PAGE_SIZE,
  type CatalogueProductPickerListRes,
  type CatalogueProductPickerQueryInput,
  type CatalogueSupplierListingListItem,
  type SupplierListingSortFieldId,
} from '@vetply/shared';
import { isAxiosError } from 'axios';
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
import type { AppliedSupplierListingFilter } from './supplier-listing-filter-model';
import { appliedSupplierListingFiltersToApiPayload } from './supplier-listing-filter-model';
import {
  createEmptySupplierListingsDraft,
  validateDraftAndBuildSupplierListingFilter,
  type SupplierListingsFilterDraft,
} from './supplier-listing-filter-validation';
import {
  buildSupplierListingsListDynamicRouteNavigation,
  buildSupplierListingsListUrl,
  parseSupplierListingsListFromQuery,
  supplierListingsListStateEquals,
  type SupplierListingsListUrlState,
} from './supplier-listings-list-url';
import type { SupplierListingSortState } from './supplier-listing-sort';
import { nextSupplierListingSortState } from './supplier-listing-sort';

type SupplierListingsViewStatus = 'idle' | 'loading' | 'ready' | 'error';

type SupplierListingsViewContextValue = {
  page: number;
  pageSize: number;
  items: CatalogueSupplierListingListItem[];
  totalCount: number;
  status: SupplierListingsViewStatus;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  refetch: () => void;
  sort: SupplierListingSortState;
  toggleSortColumn: (fieldId: SupplierListingSortFieldId) => void;
  appliedFilters: AppliedSupplierListingFilter[];
  filterDraft: SupplierListingsFilterDraft;
  setFilterDraft: Dispatch<SetStateAction<SupplierListingsFilterDraft>>;
  addFilter: () => boolean;
  removeFilter: (id: string) => void;
  searchInput: string;
  setSearchInput: Dispatch<SetStateAction<string>>;
  selectedListingIds: ReadonlySet<string>;
  selectedListingCount: number;
  toggleListingSelection: (listingId: string) => void;
  setListingSelection: (listingId: string, selected: boolean) => void;
  clearListingSelection: () => void;
  isListingSelected: (listingId: string) => boolean;
  searchCatalogueProductsForPicker: (
    params: Partial<CatalogueProductPickerQueryInput>,
  ) => Promise<CatalogueProductPickerListRes>;
  linkSelectedListingsToProduct: (productId: string) => Promise<boolean>;
  unlinkSelectedListingsFromCatalogueProduct: () => Promise<boolean>;
  filterAddModalOpen: boolean;
  openFilterAddModal: () => void;
  closeFilterAddModal: () => void;
  linkListingsModalOpen: boolean;
  openLinkListingsModal: () => void;
  closeLinkListingsModal: () => void;
};

const SupplierListingsViewContext =
  createContext<SupplierListingsViewContextValue | null>(null);

function toListState(
  page: number,
  pageSize: number,
  nameSearch: string,
  appliedFilters: AppliedSupplierListingFilter[],
  sort: SupplierListingSortState,
): SupplierListingsListUrlState {
  return { page, pageSize, nameSearch, appliedFilters, sort };
}

function logSupplierListingsRequestPayload(
  payload: Record<string, unknown>,
): void {
  console.log('[catalogue] supplier listings list request', payload);
}

function nestErrorMessage(err: unknown, fallback: string): string {
  if (!isAxiosError(err)) {
    return fallback;
  }
  const data = err.response?.data;
  if (data && typeof data === 'object' && 'message' in data) {
    const msg = (data as { message: unknown }).message;
    if (typeof msg === 'string') {
      return msg;
    }
    if (Array.isArray(msg)) {
      return msg.filter((x): x is string => typeof x === 'string').join(', ');
    }
  }
  return fallback;
}

export function SupplierListingsViewProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [hydratedFromUrl, setHydratedFromUrl] = useState(false);
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(
    CATALOGUE_SUPPLIER_LISTINGS_DEFAULT_PAGE_SIZE,
  );
  const [fetchedItems, setFetchedItems] = useState<
    CatalogueSupplierListingListItem[]
  >([]);
  const [totalCount, setTotalCount] = useState(0);
  const [status, setStatus] = useState<SupplierListingsViewStatus>('idle');
  const [fetchTick, setFetchTick] = useState(0);
  const [sort, setSort] = useState<SupplierListingSortState>(null);
  const [appliedFilters, setAppliedFilters] = useState<
    AppliedSupplierListingFilter[]
  >([]);
  const [filterDraft, setFilterDraft] = useState<SupplierListingsFilterDraft>(
    () => createEmptySupplierListingsDraft(),
  );
  const [searchInput, setSearchInput] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const searchCommitRef = useRef('');
  const [filterAddModalOpen, setFilterAddModalOpen] = useState(false);
  const [linkListingsModalOpen, setLinkListingsModalOpen] = useState(false);

  const {
    selectedIds: selectedListingIds,
    selectedCount: selectedListingCount,
    toggleSelected: toggleListingSelection,
    setSelected: setListingSelection,
    clearSelection: clearListingSelection,
    isSelected: isListingSelected,
  } = useSelectedRowIds();

  const stateRef = useRef(
    toListState(1, CATALOGUE_SUPPLIER_LISTINGS_DEFAULT_PAGE_SIZE, '', [], null),
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

  useEffect(() => {
    if (!router.isReady) {
      return;
    }
    const path = pathWithoutQueryAndTrailingSlash(router.asPath);
    if (path !== routes.admin.catalogue.supplierListings) {
      return;
    }
    if (!isNextRouterAsPathInSyncWithBrowser(router.asPath)) {
      return;
    }

    const parsed = parseSupplierListingsListFromQuery(router.query);
    if (!parsed.ok) {
      setPageState(1);
      setPageSizeState(CATALOGUE_SUPPLIER_LISTINGS_DEFAULT_PAGE_SIZE);
      setAppliedFilters([]);
      setSort(null);
      searchCommitRef.current = '';
      setSearchInput('');
      setNameSearch('');
      setHydratedFromUrl(true);
      return;
    }

    const next = parsed.data;
    if (supplierListingsListStateEquals(next, stateRef.current)) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate only when isReady+asPath gate passes
  }, [router.isReady, router.asPath]);

  const pushListUrl = useCallback(
    (state: SupplierListingsListUrlState) => {
      const url = buildSupplierListingsListUrl(
        routes.admin.catalogue.supplierListings,
        state,
      );
      const nav = buildSupplierListingsListDynamicRouteNavigation(
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

  const searchCatalogueProductsForPicker = useCallback(
    (params: Partial<CatalogueProductPickerQueryInput>) =>
      fetchCatalogueProductPicker(params),
    [],
  );

  const linkSelectedListingsToProduct = useCallback(
    async (productId: string): Promise<boolean> => {
      const ids = [...selectedListingIds];
      if (ids.length === 0) {
        return false;
      }
      try {
        await postLinkSupplierListingsToProduct({
          listingIds: ids,
          productId,
        });
        clearListingSelection();
        refetch();
        toast.success(
          ids.length === 1
            ? 'Listing linked to catalogue product.'
            : `${ids.length} listings linked to catalogue product.`,
        );
        return true;
      } catch (err: unknown) {
        toast.error(nestErrorMessage(err, 'Could not link listings.'));
        return false;
      }
    },
    [selectedListingIds, clearListingSelection, refetch],
  );

  const unlinkSelectedListingsFromCatalogueProduct =
    useCallback(async (): Promise<boolean> => {
      const ids = [...selectedListingIds];
      if (ids.length === 0) {
        return false;
      }
      try {
        await postBulkUnlinkSupplierListings({ listingIds: ids });
        clearListingSelection();
        refetch();
        toast.success(
          ids.length === 1
            ? 'Listing unlinked from catalogue product.'
            : `${ids.length} listings unlinked from catalogue products.`,
        );
        return true;
      } catch (err: unknown) {
        toast.error(nestErrorMessage(err, 'Could not unlink listings.'));
        return false;
      }
    }, [selectedListingIds, clearListingSelection, refetch]);

  const openFilterAddModal = useCallback(() => {
    setFilterAddModalOpen(true);
  }, []);

  const closeFilterAddModal = useCallback(() => {
    setFilterAddModalOpen(false);
  }, []);

  const openLinkListingsModal = useCallback(() => {
    setLinkListingsModalOpen(true);
  }, []);

  const closeLinkListingsModal = useCallback(() => {
    setLinkListingsModalOpen(false);
  }, []);

  const toggleSortColumn = useCallback(
    (fieldId: SupplierListingSortFieldId) => {
      const newSort = nextSupplierListingSortState(sort, fieldId);
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
    const result = validateDraftAndBuildSupplierListingFilter(filterDraft, () =>
      crypto.randomUUID(),
    );
    if (!result.ok) {
      toast.error(result.message);
      return false;
    }
    const newFilters = [...appliedFilters, result.filter];
    logSupplierListingsRequestPayload({
      page: 1,
      pageSize,
      sort,
      filters: newFilters,
    });
    setAppliedFilters(newFilters);
    setPageState(1);
    setFilterDraft(createEmptySupplierListingsDraft());
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
        const res = await fetchCatalogueSupplierListings({
          page,
          pageSize,
          q: nameSearch || undefined,
          filters: appliedSupplierListingFiltersToApiPayload(appliedFilters),
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
        toast.error('Could not load supplier listings.');
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

  const value = useMemo<SupplierListingsViewContextValue>(
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
      selectedListingIds,
      selectedListingCount,
      toggleListingSelection,
      setListingSelection,
      clearListingSelection,
      isListingSelected,
      searchCatalogueProductsForPicker,
      linkSelectedListingsToProduct,
      unlinkSelectedListingsFromCatalogueProduct,
      filterAddModalOpen,
      openFilterAddModal,
      closeFilterAddModal,
      linkListingsModalOpen,
      openLinkListingsModal,
      closeLinkListingsModal,
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
      setFilterDraft,
      addFilter,
      removeFilter,
      searchInput,
      setSearchInput,
      selectedListingIds,
      selectedListingCount,
      toggleListingSelection,
      setListingSelection,
      clearListingSelection,
      isListingSelected,
      searchCatalogueProductsForPicker,
      linkSelectedListingsToProduct,
      unlinkSelectedListingsFromCatalogueProduct,
      filterAddModalOpen,
      openFilterAddModal,
      closeFilterAddModal,
      linkListingsModalOpen,
      openLinkListingsModal,
      closeLinkListingsModal,
    ],
  );

  return (
    <SupplierListingsViewContext.Provider value={value}>
      {children}
    </SupplierListingsViewContext.Provider>
  );
}

export function useSupplierListingsView(): SupplierListingsViewContextValue {
  const ctx = useContext(SupplierListingsViewContext);
  if (!ctx) {
    throw new Error(
      'useSupplierListingsView must be used within SupplierListingsViewProvider',
    );
  }
  return ctx;
}
