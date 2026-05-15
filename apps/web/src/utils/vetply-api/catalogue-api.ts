import {
  catalogueBulkDeleteProductsResSchema,
  catalogueManufacturersListResSchema,
  catalogueProductDetailSchema,
  catalogueProductPickerListResSchema,
  catalogueProductPickerQueryInputSchema,
  catalogueProductsImportBatchResSchema,
  catalogueProductsImportDeleteMissingResSchema,
  catalogueProductsListQueryInputSchema,
  catalogueProductsListResSchema,
  catalogueSupplierListingsListResSchema,
  catalogueSupplierListingsQueryInputSchema,
  importSupplierPricesBatchResSchema,
  linkSupplierListingsResSchema,
  supplierListingsMappingImportBatchResSchema,
  unlinkSupplierListingsResSchema,
  type CatalogueBulkDeleteProductsBody,
  type CatalogueBulkDeleteProductsRes,
  type CatalogueManufacturerOption,
  type CatalogueProductDetail,
  type CatalogueProductPickerListRes,
  type CatalogueProductPickerQueryInput,
  type CatalogueProductUpdateBody,
  type CatalogueProductsImportBatchReq,
  type CatalogueProductsImportBatchRes,
  type CatalogueProductsImportDeleteMissingBody,
  type CatalogueProductsImportDeleteMissingRes,
  type CatalogueProductsListQueryInput,
  type CatalogueProductsListRes,
  type CatalogueSupplierListingsListRes,
  type CatalogueSupplierListingsQueryInput,
  type ImportSupplierPricesBatchReq,
  type ImportSupplierPricesBatchRes,
  type LinkSupplierListingsBody,
  type LinkSupplierListingsRes,
  type SupplierListingsMappingImportBatchReq,
  type SupplierListingsMappingImportBatchRes,
  type UnlinkSupplierListingsBody,
  type UnlinkSupplierListingsRes,
  Supplier,
} from '@vetply/shared';
import { vetplyApiClient } from './http-client';

function filenameFromContentDisposition(
  header: string | undefined,
  fallback: string,
): string {
  if (header === undefined || header === '') {
    return fallback;
  }
  const star = /filename\*=(?:UTF-8''|utf-8'')([^;\n]+)/i.exec(header);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"+|"+$/g, ''));
    } catch {
      return star[1].trim().replace(/^"+|"+$/g, '') || fallback;
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header);
  if (quoted?.[1]) {
    return quoted[1];
  }
  const bare = /filename=([^;\s]+)/i.exec(header);
  if (bare?.[1]) {
    return bare[1].replace(/^"+|"+$/g, '');
  }
  return fallback;
}

function triggerBrowserFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function getBlobExport(
  url: string,
  options?: { params?: Record<string, string> },
): Promise<{ blob: Blob; filename: string }> {
  const defaultFilename =
    options?.params?.supplier !== undefined
      ? `supplier_listings_${options.params.supplier}.csv`
      : 'catalogue_products.csv';
  const res = await vetplyApiClient.get<Blob>(url, {
    ...options,
    responseType: 'blob',
  });
  const cd = res.headers['content-disposition'];
  const filename = filenameFromContentDisposition(
    typeof cd === 'string' ? cd : undefined,
    defaultFilename,
  );
  return { blob: res.data, filename };
}

export async function downloadCatalogueProductsExportCsv(): Promise<void> {
  const { blob, filename } = await getBlobExport(
    '/admin/catalogue/products/export',
  );
  triggerBrowserFileDownload(blob, filename);
}

export async function downloadSupplierListingsExportCsv(
  supplier: Supplier,
): Promise<void> {
  const { blob, filename } = await getBlobExport(
    '/admin/catalogue/supplier-listings/export',
    { params: { supplier } },
  );
  triggerBrowserFileDownload(blob, filename);
}

export async function fetchCatalogueProducts(
  query: Partial<CatalogueProductsListQueryInput> = {},
): Promise<CatalogueProductsListRes> {
  const parsed = catalogueProductsListQueryInputSchema.parse(query);
  const params: Record<string, string | number> = {
    page: parsed.page,
    pageSize: parsed.pageSize,
  };
  if (parsed.q !== undefined) {
    params.q = parsed.q;
  }
  if (parsed.filters !== undefined && parsed.filters.length > 0) {
    params.filters = JSON.stringify(parsed.filters);
  }
  if (parsed.sort !== undefined) {
    params.sort = JSON.stringify(parsed.sort);
  }
  const { data } = await vetplyApiClient.get<unknown>(
    '/admin/catalogue/products',
    { params },
  );
  return catalogueProductsListResSchema.parse(data);
}

export async function fetchCatalogueProductPicker(
  query: Partial<CatalogueProductPickerQueryInput> = {},
): Promise<CatalogueProductPickerListRes> {
  const parsed = catalogueProductPickerQueryInputSchema.parse(query);
  const params: Record<string, string> = {};
  if (parsed.q !== undefined) {
    params.q = parsed.q;
  }
  if (parsed.legalCategory !== undefined) {
    params.legalCategory = parsed.legalCategory;
  }
  if (parsed.unitType !== undefined) {
    params.unitType = parsed.unitType;
  }
  if (parsed.unitQuantity !== undefined) {
    params.unitQuantity = parsed.unitQuantity;
  }
  const { data } = await vetplyApiClient.get<unknown>(
    '/admin/catalogue/products/picker',
    { params },
  );
  return catalogueProductPickerListResSchema.parse(data);
}

export async function fetchCatalogueSupplierListings(
  query: Partial<CatalogueSupplierListingsQueryInput> = {},
): Promise<CatalogueSupplierListingsListRes> {
  const parsed = catalogueSupplierListingsQueryInputSchema.parse(query);
  const params: Record<string, string | number> = {
    page: parsed.page,
    pageSize: parsed.pageSize,
  };
  if (parsed.q !== undefined) {
    params.q = parsed.q;
  }
  if (parsed.filters !== undefined && parsed.filters.length > 0) {
    params.filters = JSON.stringify(parsed.filters);
  }
  if (parsed.sort !== undefined) {
    params.sort = JSON.stringify(parsed.sort);
  }
  const { data } = await vetplyApiClient.get<unknown>(
    '/admin/catalogue/supplier-listings',
    { params },
  );
  return catalogueSupplierListingsListResSchema.parse(data);
}

export async function fetchCatalogueProductDetail(
  productId: string,
): Promise<CatalogueProductDetail> {
  const { data } = await vetplyApiClient.get<unknown>(
    `/admin/catalogue/products/${productId}`,
  );
  return catalogueProductDetailSchema.parse(data);
}

export async function fetchCatalogueManufacturers(): Promise<
  CatalogueManufacturerOption[]
> {
  const { data } = await vetplyApiClient.get<unknown>(
    '/admin/catalogue/manufacturers',
  );
  return catalogueManufacturersListResSchema.parse(data);
}

export async function patchCatalogueProduct(
  productId: string,
  body: CatalogueProductUpdateBody,
): Promise<CatalogueProductDetail> {
  const { data } = await vetplyApiClient.patch<unknown>(
    `/admin/catalogue/products/${productId}`,
    body,
  );
  return catalogueProductDetailSchema.parse(data);
}

export async function postCreateCatalogueProduct(): Promise<CatalogueProductDetail> {
  const { data } = await vetplyApiClient.post<unknown>(
    '/admin/catalogue/products',
  );
  return catalogueProductDetailSchema.parse(data);
}

export async function postBulkDeleteCatalogueProducts(
  body: CatalogueBulkDeleteProductsBody,
): Promise<CatalogueBulkDeleteProductsRes> {
  const { data } = await vetplyApiClient.post<unknown>(
    '/admin/catalogue/products/bulk-delete',
    body,
  );
  return catalogueBulkDeleteProductsResSchema.parse(data);
}

export async function postLinkSupplierListingsToProduct(
  body: LinkSupplierListingsBody,
): Promise<LinkSupplierListingsRes> {
  const { data } = await vetplyApiClient.post<unknown>(
    '/admin/catalogue/supplier-listings/link',
    body,
  );
  return linkSupplierListingsResSchema.parse(data);
}

export async function postBulkUnlinkSupplierListings(
  body: UnlinkSupplierListingsBody,
): Promise<UnlinkSupplierListingsRes> {
  const { data } = await vetplyApiClient.post<unknown>(
    '/admin/catalogue/supplier-listings/unlink',
    body,
  );
  return unlinkSupplierListingsResSchema.parse(data);
}

export async function postUnlinkCatalogueSupplierListing(
  productId: string,
  listingId: string,
): Promise<CatalogueProductDetail> {
  const { data } = await vetplyApiClient.post<unknown>(
    `/admin/catalogue/products/${productId}/listings/${listingId}/unlink`,
  );
  return catalogueProductDetailSchema.parse(data);
}

export async function postCatalogueImportSupplierPricesBatch(
  body: ImportSupplierPricesBatchReq,
): Promise<ImportSupplierPricesBatchRes> {
  const { data } = await vetplyApiClient.post<unknown>(
    '/admin/catalogue/import-supplier-prices/batch',
    body,
  );
  return importSupplierPricesBatchResSchema.parse(data);
}

export async function postCatalogueProductsImportDeleteMissing(
  body: CatalogueProductsImportDeleteMissingBody,
): Promise<CatalogueProductsImportDeleteMissingRes> {
  const { data } = await vetplyApiClient.post<unknown>(
    '/admin/catalogue/products/import/delete-missing',
    body,
  );
  return catalogueProductsImportDeleteMissingResSchema.parse(data);
}

export async function postCatalogueProductsImportBatch(
  body: CatalogueProductsImportBatchReq,
): Promise<CatalogueProductsImportBatchRes> {
  const { data } = await vetplyApiClient.post<unknown>(
    '/admin/catalogue/products/import/batch',
    body,
  );
  return catalogueProductsImportBatchResSchema.parse(data);
}

export async function postSupplierListingsMappingImportBatch(
  body: SupplierListingsMappingImportBatchReq,
): Promise<SupplierListingsMappingImportBatchRes> {
  const { data } = await vetplyApiClient.post<unknown>(
    '/admin/catalogue/supplier-listings/import-mapping/batch',
    body,
  );
  return supplierListingsMappingImportBatchResSchema.parse(data);
}
