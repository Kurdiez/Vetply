'use client';

import { Button } from '@/components/ui/Button';
import { InlineHighlight } from '@/components/ui/InlineHighlight';
import { Modal } from '@/components/ui/Modal';

export type MappingImportsHelpModalProps = {
  open: boolean;
  onClose: () => void;
};

export function MappingImportsHelpModal({
  open,
  onClose,
}: MappingImportsHelpModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="CSV import — what to do"
      description="Match exports to imports, know what changes, and when rows are skipped."
      maxWidth="lg"
      panelClassName="max-w-2xl"
      footer={
        <Button type="button" variant="primary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="mt-4 space-y-6 text-sm text-gray-300">
        <section>
          <h3 className="text-sm font-semibold text-white">
            Catalogue products
          </h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              Export from this page, edit, then import so headers match exactly.
            </li>
            <li>
              Products present in the system but missing from your file are
              deleted. Supplier listings stay; they unlink. New rows (blank{' '}
              <InlineHighlight>id</InlineHighlight>) never trigger deletes —
              only UUIDs in the file decide what is removed.
            </li>
            <li>
              Blank <InlineHighlight>id</InlineHighlight>: new product (new
              UUID). Filled <InlineHighlight>id</InlineHighlight>: update that
              product.
            </li>
            <li>
              <InlineHighlight>manufacturer</InlineHighlight>: use an existing
              name (ignore case). Empty cell = none. Unknown name = row skipped.
            </li>
            <li>
              Fix validation errors before re-running; the report lists skipped
              rows and columns (units, categories, POM, quantities, etc.).
            </li>
            <li>
              If every row has blank <InlineHighlight>id</InlineHighlight>, no
              products are deleted — only inserts and updates.
            </li>
            <li>
              Watch the Import button progress for large files (batched runs).
            </li>
          </ul>
        </section>
        <section>
          <h3 className="text-sm font-semibold text-white">
            Supplier listing mappings (NVS, Veenak, Covetrus, MWIAH)
          </h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              Use that supplier&apos;s export; each import card only edits that
              supplier&apos;s listings.
            </li>
            <li>
              Updates listings by <InlineHighlight>id</InlineHighlight> only —
              no new listings, no deletions.
            </li>
            <li>
              Unknown <InlineHighlight>id</InlineHighlight> or wrong supplier =
              skip row.
            </li>
            <li>
              Blank <InlineHighlight>catalogue_product_id</InlineHighlight>:
              remove catalogue link for that listing.
            </li>
            <li>
              Non-blank <InlineHighlight>catalogue_product_id</InlineHighlight>{' '}
              must exist or the row is skipped.
            </li>
            <li>
              Invalid <InlineHighlight>listed_price</InlineHighlight> or blank{' '}
              <InlineHighlight>name</InlineHighlight> = skip; check the report
              after import.
            </li>
          </ul>
        </section>
      </div>
    </Modal>
  );
}
