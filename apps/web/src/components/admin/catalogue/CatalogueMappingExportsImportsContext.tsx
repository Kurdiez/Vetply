'use client';

import type { CatalogueImportReportModalState } from '@/components/admin/catalogue/mapping-import/CatalogueImportReportModal';
import {
  runCatalogueProductsMappingImport,
  runSupplierListingsMappingImport,
} from '@/utils/catalogue-mapping-import-runners';
import {
  downloadCatalogueProductsExportCsv,
  downloadSupplierListingsExportCsv,
} from '@/utils/vetply-api/catalogue-api';
import { Supplier } from '@vetply/shared';
import { isAxiosError } from 'axios';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { messageForVetplyFailReason } from '@/utils/vetply-api/fail-reason-messages';
import { isVetplyBadRequestError } from '@/utils/vetply-api/vetply-bad-request-error';

export type CatalogueMappingExportKey =
  | 'products'
  | 'nvs'
  | 'veenak'
  | 'covetrus';

type MappingCardDefinition = {
  key: CatalogueMappingExportKey;
  title: string;
  logo: { src: string; alt: string };
  supplier?: Supplier;
};

export const MAPPING_IMPORT_EXPORT_PAGE_CARDS: readonly MappingCardDefinition[] =
  [
    {
      key: 'products',
      title: 'Catalogue products',
      logo: { src: '/logo.svg', alt: 'Vetply' },
    },
    {
      key: 'nvs',
      title: 'NVS listings',
      logo: { src: '/suppliers/NVS.png', alt: 'NVS' },
      supplier: Supplier.NVS,
    },
    {
      key: 'veenak',
      title: 'Veenak listings',
      logo: { src: '/suppliers/veenak.png', alt: 'Veenak' },
      supplier: Supplier.VEENAK,
    },
    {
      key: 'covetrus',
      title: 'Covetrus listings',
      logo: { src: '/suppliers/covetrus.png', alt: 'Covetrus' },
      supplier: Supplier.COVETRUS,
    },
  ];

export type MappingCardViewModel = {
  key: CatalogueMappingExportKey;
  title: string;
  logo: { src: string; alt: string };
  pageBusy: boolean;
  isExportBusy: boolean;
  isImportBusy: boolean;
  importProgressPct: number | null;
  onExport: () => void;
  onImportPick: () => void;
  setImportFileInputRef: (el: HTMLInputElement | null) => void;
  onImportFileInputChange: (ev: ChangeEvent<HTMLInputElement>) => void;
};

type CatalogueMappingExportsImportsContextValue = {
  pageBusy: boolean;
  mappingCardViewModels: readonly MappingCardViewModel[];
  importReportOpen: boolean;
  importReportState: CatalogueImportReportModalState | null;
  closeImportReport: () => void;
};

const CatalogueMappingExportsImportsContext =
  createContext<CatalogueMappingExportsImportsContextValue | null>(null);

function nestErrorMessage(err: unknown, fallback: string): string {
  if (!isAxiosError(err)) {
    return fallback;
  }
  const data = err.response?.data;
  if (data instanceof Blob) {
    return fallback;
  }
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

function exportKeyToSupplier(
  key: CatalogueMappingExportKey,
): Supplier | undefined {
  if (key === 'nvs') {
    return Supplier.NVS;
  }
  if (key === 'veenak') {
    return Supplier.VEENAK;
  }
  if (key === 'covetrus') {
    return Supplier.COVETRUS;
  }
  return undefined;
}

function supplierToCardKey(supplier: Supplier): CatalogueMappingExportKey {
  if (supplier === Supplier.NVS) {
    return 'nvs';
  }
  if (supplier === Supplier.VEENAK) {
    return 'veenak';
  }
  return 'covetrus';
}

export function CatalogueMappingExportsImportsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [exportingKey, setExportingKey] =
    useState<CatalogueMappingExportKey | null>(null);
  const [importBusyKey, setImportBusyKey] =
    useState<CatalogueMappingExportKey | null>(null);
  const [importProgressPct, setImportProgressPct] = useState<number | null>(
    null,
  );
  const [importReportOpen, setImportReportOpen] = useState(false);
  const [importReportState, setImportReportState] =
    useState<CatalogueImportReportModalState | null>(null);

  const fileInputsRef = useRef<
    Partial<Record<CatalogueMappingExportKey, HTMLInputElement | null>>
  >({});

  const pageBusy = exportingKey !== null || importBusyKey !== null;

  const registerImportFileInput = useCallback(
    (key: CatalogueMappingExportKey, el: HTMLInputElement | null) => {
      fileInputsRef.current[key] = el;
    },
    [],
  );

  const pickImportFile = useCallback((key: CatalogueMappingExportKey) => {
    fileInputsRef.current[key]?.click();
  }, []);

  const closeImportReport = useCallback(() => {
    setImportReportOpen(false);
    setImportReportState(null);
  }, []);

  const exportProductsCsv = useCallback(async () => {
    setExportingKey('products');
    try {
      await downloadCatalogueProductsExportCsv();
      toast.success('Catalogue products export downloaded.');
    } catch (err: unknown) {
      toast.error(
        nestErrorMessage(err, 'Could not export catalogue products.'),
      );
    } finally {
      setExportingKey(null);
    }
  }, []);

  const exportSupplierListingsCsv = useCallback(async (supplier: Supplier) => {
    setExportingKey(supplierToCardKey(supplier));
    try {
      await downloadSupplierListingsExportCsv(supplier);
      toast.success(`${supplier} listings export downloaded.`);
    } catch (err: unknown) {
      toast.error(
        nestErrorMessage(
          err,
          `Could not export ${supplier} supplier listings.`,
        ),
      );
    } finally {
      setExportingKey(null);
    }
  }, []);

  const runExportForCard = useCallback(
    (key: CatalogueMappingExportKey) => {
      if (key === 'products') {
        void exportProductsCsv();
        return;
      }
      const supplier = exportKeyToSupplier(key);
      if (supplier !== undefined) {
        void exportSupplierListingsCsv(supplier);
      }
    },
    [exportProductsCsv, exportSupplierListingsCsv],
  );

  const processImportFile = useCallback(
    async (key: CatalogueMappingExportKey, file: File | null) => {
      if (file === null) {
        return;
      }
      setImportBusyKey(key);
      setImportProgressPct(0);
      try {
        if (key === 'products') {
          const result = await runCatalogueProductsMappingImport(
            file,
            setImportProgressPct,
          );
          setImportReportState({ kind: 'products', result });
          setImportReportOpen(true);
        } else {
          const supplier = exportKeyToSupplier(key);
          if (supplier === undefined) {
            throw new Error('Unknown import target');
          }
          const result = await runSupplierListingsMappingImport(
            file,
            supplier,
            setImportProgressPct,
          );
          setImportReportState({ kind: 'listings', supplier, result });
          setImportReportOpen(true);
        }
      } catch (err: unknown) {
        if (isVetplyBadRequestError(err)) {
          toast.error(messageForVetplyFailReason(err.failReason));
        } else if (err instanceof Error && err.message === 'NO_DATA_ROWS') {
          toast.error('No importable data rows found in this file.');
        } else if (
          err instanceof Error &&
          err.message.includes('Missing CSV columns')
        ) {
          toast.error(err.message);
        } else if (isAxiosError(err)) {
          toast.error(
            nestErrorMessage(
              err,
              'Import failed. Earlier steps may already be saved.',
            ),
          );
        } else {
          toast.error(
            err instanceof Error ? err.message : 'Import failed. Try again.',
          );
        }
      } finally {
        setImportBusyKey(null);
        setImportProgressPct(null);
      }
    },
    [],
  );

  const buildImportFileInputChangeHandler = useCallback(
    (key: CatalogueMappingExportKey) => {
      return (ev: ChangeEvent<HTMLInputElement>) => {
        const f = ev.target.files?.[0] ?? null;
        ev.target.value = '';
        void processImportFile(key, f);
      };
    },
    [processImportFile],
  );

  const mappingCardViewModels = useMemo((): readonly MappingCardViewModel[] => {
    return MAPPING_IMPORT_EXPORT_PAGE_CARDS.map((def) => {
      const key = def.key;
      return {
        key,
        title: def.title,
        logo: def.logo,
        pageBusy,
        isExportBusy: exportingKey === key,
        isImportBusy: importBusyKey === key,
        importProgressPct: importBusyKey === key ? importProgressPct : null,
        onExport: () => runExportForCard(key),
        onImportPick: () => pickImportFile(key),
        setImportFileInputRef: (el) => registerImportFileInput(key, el),
        onImportFileInputChange: buildImportFileInputChangeHandler(key),
      };
    });
  }, [
    buildImportFileInputChangeHandler,
    exportingKey,
    importBusyKey,
    importProgressPct,
    pageBusy,
    pickImportFile,
    registerImportFileInput,
    runExportForCard,
  ]);

  const value = useMemo<CatalogueMappingExportsImportsContextValue>(
    () => ({
      pageBusy,
      mappingCardViewModels,
      importReportOpen,
      importReportState,
      closeImportReport,
    }),
    [
      closeImportReport,
      importReportOpen,
      importReportState,
      mappingCardViewModels,
      pageBusy,
    ],
  );

  return (
    <CatalogueMappingExportsImportsContext.Provider value={value}>
      {children}
    </CatalogueMappingExportsImportsContext.Provider>
  );
}

export function useCatalogueMappingExportsImports(): CatalogueMappingExportsImportsContextValue {
  const ctx = useContext(CatalogueMappingExportsImportsContext);
  if (ctx === null) {
    throw new Error(
      'useCatalogueMappingExportsImports must be used within CatalogueMappingExportsImportsProvider',
    );
  }
  return ctx;
}
