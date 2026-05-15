'use client';

import { AdminListPageHeader } from '@/components/admin/list/AdminListPageHeader';
import { AdminListStack } from '@/components/admin/list/AdminListStack';
import { Button } from '@/components/ui/Button';
import { CatalogueImportReportModal } from '@/components/admin/catalogue/mapping-import/CatalogueImportReportModal';
import { MappingImportsHelpModal } from '@/components/admin/catalogue/mapping-import/MappingImportsHelpModal';
import {
  CatalogueMappingExportsImportsProvider,
  useCatalogueMappingExportsImports,
} from './CatalogueMappingExportsImportsContext';
import { MappingExportCards } from './MappingExportCards';
import { InformationCircleIcon } from '@heroicons/react/20/solid';
import { useCallback, useState } from 'react';

function CatalogueMappingExportsImportsBody() {
  const [helpOpen, setHelpOpen] = useState(false);
  const openHelp = useCallback(() => setHelpOpen(true), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);

  const {
    mappingCardViewModels,
    importReportOpen,
    importReportState,
    closeImportReport,
  } = useCatalogueMappingExportsImports();

  const pageBusy = mappingCardViewModels.some((c) => c.pageBusy);

  return (
    <div>
      <AdminListPageHeader
        title="Mapping exports / imports"
        description={
          <ol className="list-decimal space-y-1 pl-5 text-gray-300">
            <li>
              Export to download a CSV snapshot of what is in the database.
            </li>
            <li>
              Open the CSV in Excel and change catalogue or listing mappings.
            </li>
            <li>Save or export from Excel as CSV.</li>
            <li>Import that CSV here to apply your changes to the database.</li>
          </ol>
        }
        actions={
          <Button
            type="button"
            variant="secondary"
            disabled={pageBusy}
            className="inline-flex items-center gap-2"
            onClick={openHelp}
          >
            <InformationCircleIcon className="size-5 shrink-0" aria-hidden />
            How imports work
          </Button>
        }
      />
      <AdminListStack>
        <MappingExportCards cards={mappingCardViewModels} />
      </AdminListStack>
      <MappingImportsHelpModal open={helpOpen} onClose={closeHelp} />
      <CatalogueImportReportModal
        open={importReportOpen}
        onClose={closeImportReport}
        state={importReportState}
      />
    </div>
  );
}

export function CatalogueMappingExportsImportsPage() {
  return (
    <CatalogueMappingExportsImportsProvider>
      <CatalogueMappingExportsImportsBody />
    </CatalogueMappingExportsImportsProvider>
  );
}
