import {
  catalogueManufacturersListResSchema,
  catalogueProductDetailSchema,
  catalogueProductsListQueryInputSchema,
  catalogueProductsListResSchema,
  importSupplierPricesBatchResSchema,
  type CatalogueManufacturerOption,
  type CatalogueProductDetail,
  type CatalogueProductUpdateBody,
  type CatalogueProductsListQueryInput,
  type CatalogueProductsListRes,
  type ImportSupplierPricesBatchReq,
  type ImportSupplierPricesBatchRes,
} from "@vetply/shared";
import { vetplyApiClient } from "./http-client";

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
    "/admin/catalogue/products",
    { params },
  );
  return catalogueProductsListResSchema.parse(data);
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
    "/admin/catalogue/manufacturers",
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

export async function postCatalogueImportSupplierPricesBatch(
  body: ImportSupplierPricesBatchReq,
): Promise<ImportSupplierPricesBatchRes> {
  const { data } = await vetplyApiClient.post<unknown>(
    "/admin/catalogue/import-supplier-prices/batch",
    body,
  );
  return importSupplierPricesBatchResSchema.parse(data);
}
