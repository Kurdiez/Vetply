import {
  catalogueBulkDeleteProductsResSchema,
  catalogueManufacturersListResSchema,
  catalogueProductDetailSchema,
  catalogueProductPickerListResSchema,
  catalogueProductPickerQueryInputSchema,
  catalogueProductsListQueryInputSchema,
  catalogueProductsListResSchema,
  catalogueSupplierListingsListResSchema,
  catalogueSupplierListingsQueryInputSchema,
  importSupplierPricesBatchResSchema,
  linkSupplierListingsResSchema,
  unlinkSupplierListingsResSchema,
  type CatalogueBulkDeleteProductsBody,
  type CatalogueBulkDeleteProductsRes,
  type CatalogueManufacturerOption,
  type CatalogueProductDetail,
  type CatalogueProductPickerListRes,
  type CatalogueProductPickerQueryInput,
  type CatalogueProductUpdateBody,
  type CatalogueProductsListQueryInput,
  type CatalogueProductsListRes,
  type CatalogueSupplierListingsListRes,
  type CatalogueSupplierListingsQueryInput,
  type ImportSupplierPricesBatchReq,
  type ImportSupplierPricesBatchRes,
  type LinkSupplierListingsBody,
  type LinkSupplierListingsRes,
  type UnlinkSupplierListingsBody,
  type UnlinkSupplierListingsRes,
} from '@vetply/shared';
import { vetplyApiClient } from './http-client';

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
