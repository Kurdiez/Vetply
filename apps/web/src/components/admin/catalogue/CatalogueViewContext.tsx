"use client";

import {
  CATALOGUE_PRODUCTS_DEFAULT_PAGE_SIZE,
  type CatalogueProductListItem,
} from "@vetply/shared";
import { fetchCatalogueProducts } from "@/utils/vetply-api/catalogue-api";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { toast } from "sonner";
import type { AppliedFilter, CatalogueSortFieldId } from "./catalogue-filter-model";
import {
  appliedFiltersToApiPayload,
  logCatalogueListRequestPayload,
} from "./catalogue-filter-model";
import {
  createEmptyDraft,
  validateDraftAndBuildFilter,
  type CatalogueFilterDraft,
} from "./catalogue-filter-validation";
import type { CatalogueSortState } from "./catalogue-sort";
import { nextSortState } from "./catalogue-sort";

type CatalogueViewStatus = "idle" | "loading" | "ready" | "error";

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
};

const CatalogueViewContext = createContext<CatalogueViewContextValue | null>(
  null,
);

export function CatalogueViewProvider({ children }: { children: ReactNode }) {
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(
    CATALOGUE_PRODUCTS_DEFAULT_PAGE_SIZE,
  );
  const [fetchedItems, setFetchedItems] = useState<CatalogueProductListItem[]>(
    [],
  );
  const [totalCount, setTotalCount] = useState(0);
  const [status, setStatus] = useState<CatalogueViewStatus>("idle");
  const [fetchTick, setFetchTick] = useState(0);
  const [sort, setSort] = useState<CatalogueSortState>(null);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilter[]>([]);
  const [filterDraft, setFilterDraft] = useState<CatalogueFilterDraft>(() =>
    createEmptyDraft(),
  );

  const items = fetchedItems;

  const setPage = useCallback((next: number) => {
    setPageState(Math.max(1, next));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageState(1);
  }, []);

  const refetch = useCallback(() => {
    setFetchTick((t) => t + 1);
  }, []);

  const toggleSortColumn = useCallback((fieldId: CatalogueSortFieldId) => {
    setSort((s) => nextSortState(s, fieldId));
  }, []);

  const addFilter = useCallback((): boolean => {
    const result = validateDraftAndBuildFilter(filterDraft, () =>
      crypto.randomUUID(),
    );
    if (!result.ok) {
      toast.error(result.message);
      return false;
    }
    setAppliedFilters((prev) => {
      const next = [...prev, result.filter];
      logCatalogueListRequestPayload({
        page: 1,
        pageSize,
        sort,
        filters: next,
      });
      return next;
    });
    setPageState(1);
    setFilterDraft(createEmptyDraft());
    return true;
  }, [filterDraft, pageSize, sort]);

  const removeFilter = useCallback((id: string) => {
    setAppliedFilters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(totalCount / pageSize));
    if (page > maxPage) {
      setPageState(maxPage);
    }
  }, [totalCount, pageSize, page]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setStatus("loading");
      try {
        const res = await fetchCatalogueProducts({
          page,
          pageSize,
          filters: appliedFiltersToApiPayload(appliedFilters),
          sort: sort ?? undefined,
        });
        if (cancelled) {
          return;
        }
        setFetchedItems(res.items);
        setTotalCount(res.totalCount);
        setStatus("ready");
      } catch {
        if (cancelled) {
          return;
        }
        setStatus("error");
        toast.error("Could not load catalogue.");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, fetchTick, appliedFilters, sort]);

  const value = useMemo<CatalogueViewContextValue>(
    () => ({
      page,
      pageSize,
      items,
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
    }),
    [
      page,
      pageSize,
      items,
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
    throw new Error("useCatalogueView must be used within CatalogueViewProvider");
  }
  return ctx;
}
