import type {
  CatalogueCsvImportRowFailure,
  CatalogueProductImportRow,
} from '@vetply/shared';
import { z } from 'zod';
import Papa from 'papaparse';

const UUID_SCHEMA = z.string().uuid();

const PRODUCT_HEADER_ORDER = [
  'id',
  'name',
  'unit_quantity',
  'unit_type',
  'legal_category',
  'sales_category',
  'pom',
  'manufacturer',
  'image',
] as const;

export type CatalogueProductsCsvParseResult = {
  rows: CatalogueProductImportRow[];
  productIdsInCsv: string[];
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

export function parseCatalogueProductsImportCsv(
  file: File,
): Promise<CatalogueProductsCsvParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        const metaFields = (results.meta.fields ?? []).map(normalizeHeaderKey);
        const missing = PRODUCT_HEADER_ORDER.filter(
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
        const rows: CatalogueProductImportRow[] = [];
        const idSet = new Set<string>();
        let dataRowNumber = 0;

        for (const raw of results.data) {
          if (typeof raw !== 'object' || raw === null || !('id' in raw)) {
            continue;
          }
          dataRowNumber += 1;
          const m = buildRowMap(raw as Record<string, unknown>);
          const id = m.id?.trim() ?? '';

          if (id.length === 0) {
            rows.push({
              rowNumber: dataRowNumber,
              id: '',
              name: m.name ?? '',
              unit_quantity: m.unit_quantity ?? '',
              unit_type: m.unit_type ?? '',
              legal_category: m.legal_category ?? '',
              sales_category: m.sales_category ?? '',
              pom: m.pom ?? '',
              manufacturer: m.manufacturer ?? '',
              image: m.image ?? '',
            });
            continue;
          }

          const idParsed = UUID_SCHEMA.safeParse(id);
          if (!idParsed.success) {
            parseFailures.push({
              rowNumber: dataRowNumber,
              column: 'id',
              value: m.id ?? '',
              message: 'id must be empty (new product) or a valid UUID',
            });
            continue;
          }
          idSet.add(idParsed.data);
          rows.push({
            rowNumber: dataRowNumber,
            id: idParsed.data,
            name: m.name ?? '',
            unit_quantity: m.unit_quantity ?? '',
            unit_type: m.unit_type ?? '',
            legal_category: m.legal_category ?? '',
            sales_category: m.sales_category ?? '',
            pom: m.pom ?? '',
            manufacturer: m.manufacturer ?? '',
            image: m.image ?? '',
          });
        }

        if (dataRowNumber === 0) {
          reject(new Error('NO_DATA_ROWS'));
          return;
        }

        resolve({
          rows,
          productIdsInCsv: [...idSet],
          parseFailures,
        });
      },
      error: (err: Error) => reject(err),
    });
  });
}
