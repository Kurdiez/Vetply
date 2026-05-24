'use client';

import {
  fetchCatalogueManufacturers,
  patchCatalogueManufacturer,
  postCatalogueManufacturer,
} from '@/utils/vetply-api/catalogue-manufacturers-api';
import { messageForVetplyFailReason } from '@/utils/vetply-api/fail-reason-messages';
import { isVetplyBadRequestError } from '@/utils/vetply-api/vetply-bad-request-error';
import type { CatalogueManufacturerOption } from '@vetply/shared';
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

type ManufacturersViewStatus = 'idle' | 'loading' | 'ready' | 'error';

type ManufacturersViewContextValue = {
  items: CatalogueManufacturerOption[];
  status: ManufacturersViewStatus;
  refetch: () => void;
  addModalOpen: boolean;
  openAddModal: () => void;
  closeAddModal: () => void;
  editingManufacturer: CatalogueManufacturerOption | null;
  openEditModal: (manufacturer: CatalogueManufacturerOption) => void;
  closeEditModal: () => void;
  submitting: boolean;
  createManufacturer: (name: string) => Promise<void>;
  updateManufacturer: (id: string, name: string) => Promise<void>;
};

const ManufacturersViewContext =
  createContext<ManufacturersViewContextValue | null>(null);

export function ManufacturersViewProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [items, setItems] = useState<CatalogueManufacturerOption[]>([]);
  const [status, setStatus] = useState<ManufacturersViewStatus>('idle');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingManufacturer, setEditingManufacturer] =
    useState<CatalogueManufacturerOption | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const rows = await fetchCatalogueManufacturers();
      setItems(rows);
      setStatus('ready');
    } catch {
      setStatus('error');
      toast.error('Could not load manufacturers.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refetch = useCallback(() => {
    void load();
  }, [load]);

  const openAddModal = useCallback(() => {
    setAddModalOpen(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setAddModalOpen(false);
  }, []);

  const openEditModal = useCallback(
    (manufacturer: CatalogueManufacturerOption) => {
      setEditingManufacturer(manufacturer);
    },
    [],
  );

  const closeEditModal = useCallback(() => {
    setEditingManufacturer(null);
  }, []);

  const createManufacturer = useCallback(
    async (name: string) => {
      setSubmitting(true);
      try {
        await postCatalogueManufacturer({ name });
        toast.success('Manufacturer created.');
        closeAddModal();
        await load();
      } catch (err) {
        if (isVetplyBadRequestError(err)) {
          toast.error(messageForVetplyFailReason(err.failReason));
          return;
        }
        toast.error('Could not create manufacturer.');
      } finally {
        setSubmitting(false);
      }
    },
    [closeAddModal, load],
  );

  const updateManufacturer = useCallback(
    async (id: string, name: string) => {
      setSubmitting(true);
      try {
        await patchCatalogueManufacturer(id, { name });
        toast.success('Manufacturer updated.');
        closeEditModal();
        await load();
      } catch (err) {
        if (isVetplyBadRequestError(err)) {
          toast.error(messageForVetplyFailReason(err.failReason));
          return;
        }
        toast.error('Could not update manufacturer.');
      } finally {
        setSubmitting(false);
      }
    },
    [closeEditModal, load],
  );

  const value = useMemo(
    (): ManufacturersViewContextValue => ({
      items,
      status,
      refetch,
      addModalOpen,
      openAddModal,
      closeAddModal,
      editingManufacturer,
      openEditModal,
      closeEditModal,
      submitting,
      createManufacturer,
      updateManufacturer,
    }),
    [
      items,
      status,
      refetch,
      addModalOpen,
      openAddModal,
      closeAddModal,
      editingManufacturer,
      openEditModal,
      closeEditModal,
      submitting,
      createManufacturer,
      updateManufacturer,
    ],
  );

  return (
    <ManufacturersViewContext.Provider value={value}>
      {children}
    </ManufacturersViewContext.Provider>
  );
}

export function useManufacturersView(): ManufacturersViewContextValue {
  const ctx = useContext(ManufacturersViewContext);
  if (!ctx) {
    throw new Error(
      'useManufacturersView must be used within ManufacturersViewProvider',
    );
  }
  return ctx;
}
