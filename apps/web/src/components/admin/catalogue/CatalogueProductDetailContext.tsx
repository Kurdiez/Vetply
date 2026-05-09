'use client';

import {
  fetchCatalogueProductDetail,
  patchCatalogueProduct,
  postUnlinkCatalogueSupplierListing,
} from '@/utils/vetply-api/catalogue-api';
import type {
  CatalogueProductDetail,
  CatalogueProductUpdateBody,
} from '@vetply/shared';
import { useRouter } from 'next/router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';

type CatalogueProductDetailStatus = 'idle' | 'loading' | 'ready' | 'error';

type CatalogueProductDetailContextValue = {
  productId: string;
  detail: CatalogueProductDetail | null;
  status: CatalogueProductDetailStatus;
  refetch: () => void;
  goBack: () => void;
  editModalOpen: boolean;
  openEditModal: () => void;
  closeEditModal: () => void;
  saveProduct: (body: CatalogueProductUpdateBody) => Promise<void>;
  unlinkSupplierListing: (listingId: string) => Promise<void>;
  unlinkingListingId: string | null;
};

const CatalogueProductDetailContext =
  createContext<CatalogueProductDetailContextValue | null>(null);

export function CatalogueProductDetailProvider({
  productId,
  children,
}: {
  productId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<CatalogueProductDetail | null>(null);
  const [status, setStatus] = useState<CatalogueProductDetailStatus>('idle');
  const [fetchTick, setFetchTick] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [unlinkingListingId, setUnlinkingListingId] = useState<string | null>(
    null,
  );

  const refetch = useCallback(() => {
    setFetchTick((t) => t + 1);
  }, []);

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  const openEditModal = useCallback(() => {
    setEditModalOpen(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setEditModalOpen(false);
  }, []);

  const saveProduct = useCallback(
    async (body: CatalogueProductUpdateBody) => {
      try {
        const updated = await patchCatalogueProduct(productId, body);
        setDetail(updated);
        setEditModalOpen(false);
        toast.success('Product updated.');
      } catch {
        toast.error('Could not save product.');
        throw new Error('save failed');
      }
    },
    [productId],
  );

  const unlinkSupplierListing = useCallback(
    async (listingId: string) => {
      setUnlinkingListingId(listingId);
      try {
        const updated = await postUnlinkCatalogueSupplierListing(
          productId,
          listingId,
        );
        setDetail(updated);
        toast.success('Supplier listing unlinked.');
      } catch {
        toast.error('Could not unlink supplier listing.');
      } finally {
        setUnlinkingListingId(null);
      }
    },
    [productId],
  );

  useEffect(() => {
    if (!productId) {
      return;
    }
    let cancelled = false;

    async function run() {
      setStatus('loading');
      try {
        const d = await fetchCatalogueProductDetail(productId);
        if (cancelled) {
          return;
        }
        setDetail(d);
        setStatus('ready');
      } catch {
        if (cancelled) {
          return;
        }
        setDetail(null);
        setStatus('error');
        toast.error('Could not load product.');
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [productId, fetchTick]);

  const value = useMemo<CatalogueProductDetailContextValue>(
    () => ({
      productId,
      detail,
      status,
      refetch,
      goBack,
      editModalOpen,
      openEditModal,
      closeEditModal,
      saveProduct,
      unlinkSupplierListing,
      unlinkingListingId,
    }),
    [
      productId,
      detail,
      status,
      refetch,
      goBack,
      editModalOpen,
      openEditModal,
      closeEditModal,
      saveProduct,
      unlinkSupplierListing,
      unlinkingListingId,
    ],
  );

  return (
    <CatalogueProductDetailContext.Provider value={value}>
      {children}
    </CatalogueProductDetailContext.Provider>
  );
}

export function useCatalogueProductDetail(): CatalogueProductDetailContextValue {
  const ctx = useContext(CatalogueProductDetailContext);
  if (!ctx) {
    throw new Error(
      'useCatalogueProductDetail must be used within CatalogueProductDetailProvider',
    );
  }
  return ctx;
}
