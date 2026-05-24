import type {
  CatalogueCsvImportRowFailure,
  SupplierListingsMappingImportRow,
} from '@vetply/shared';
import { z } from 'zod';
import Papa from 'papaparse';

const UUID_SCHEMA = z.string().uuid();

const LISTING_HEADER_ORDER = [
  'catalogue_product_id',
  'name',
  'supplier_product_id',
  'listed_price',
  'id',
] as const;

export type SupplierListingsMappingCsvParseResult = {
  rows: SupplierListingsMappingImportRow[];
  parseFailures: CatalogueCsvImportRowFailure[];
};

function normalizeHeaderKey(key: string): string {
  return key.replace(/^\uFEFF/, '').trim();
}

function cell(row: Record<string, unknown>, header: string): string {
  const raw = row[header];
  if (raw === null || raw === undefined) {
    return '';
  }
  return String(raw);
}

function buildRowMap(rawRow: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(rawRow)) {
    out[normalizeHeaderKey(key)] = cell(rawRow, key);
  }
  return out;
}

export function parseSupplierListingsMappingCsv(
  file: File,
): Promise<SupplierListingsMappingCsvParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        const metaFields = (results.meta.fields ?? []).map(normalizeHeaderKey);
        const missing = LISTING_HEADER_ORDER.filter(
          (h) => !metaFields.includes(h),
        );
        if (missing.length > 0) {
          reject(
            new Error(
              `Missing CSV columns: ${missing.join(', ')}. Export fresh CSV from admin.`,
            ),
          );
          return;
        }

        const parseFailures: CatalogueCsvImportRowFailure[] = [];
        const rows: SupplierListingsMappingImportRow[] = [];
        let dataRowNumber = 0;

        for (const raw of results.data) {
          if (typeof raw !== 'object' || raw === null || !('id' in raw)) {
            continue;
          }
          dataRowNumber += 1;
          const m = buildRowMap(raw as Record<string, unknown>);
          const id = m.id?.trim() ?? '';
          const idParsed = UUID_SCHEMA.safeParse(id);
          if (!idParsed.success) {
            parseFailures.push({
              rowNumber: dataRowNumber,
              column: 'id',
              value: m.id ?? '',
              message: 'id must be a valid UUID',
            });
            continue;
          }
          rows.push({
            rowNumber: dataRowNumber,
            catalogue_product_id: m.catalogue_product_id ?? '',
            name: m.name ?? '',
            supplier_product_id: m.supplier_product_id ?? '',
            listed_price: m.listed_price ?? '',
            id: idParsed.data,
          });
        }

        if (dataRowNumber === 0) {
          reject(new Error('NO_DATA_ROWS'));
          return;
        }

        resolve({
          rows,
          parseFailures,
        });
      },
      error: (err: Error) => reject(err),
    });
  });
}
