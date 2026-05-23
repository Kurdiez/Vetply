import type { SupplierListingsMappingImportFailReason } from '../rest-api/catalogue/supplier-listings-mapping-import-fail-reason.schemas';
import type { SupplierListingsMappingImportRow } from '../rest-api/catalogue/catalogue-csv-import.schemas';

export const DUPLICATE_CATALOGUE_PRODUCT_MAPPING_FAIL_REASON =
  'DUPLICATE_CATALOGUE_PRODUCT_MAPPING' as const satisfies SupplierListingsMappingImportFailReason;

export function findDuplicateCatalogueProductIdInSupplierListingsMappingRows(
  rows: Pick<SupplierListingsMappingImportRow, 'catalogue_product_id'>[],
): SupplierListingsMappingImportFailReason | null {
  const seen = new Set<string>();
  for (const row of rows) {
    const productId = row.catalogue_product_id.trim();
    if (productId.length === 0) {
      continue;
    }
    if (seen.has(productId)) {
      return DUPLICATE_CATALOGUE_PRODUCT_MAPPING_FAIL_REASON;
    }
    seen.add(productId);
  }
  return null;
}
