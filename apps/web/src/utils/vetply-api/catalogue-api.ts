import {
  catalogueProductDetailReqSchema,
  catalogueProductDetailResSchema,
  catalogueProductsListQueryInputSchema,
  catalogueProductsListResSchema,
  type CatalogueProductDetailRes,
  type CatalogueProductsListQueryInput,
  type CatalogueProductsListRes,
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
): Promise<CatalogueProductDetailRes> {
  const body = catalogueProductDetailReqSchema.parse({ productId });
  const { data } = await vetplyApiClient.post<unknown>(
    "/admin/catalogue/products/detail",
    body,
  );
  return catalogueProductDetailResSchema.parse(data);
}
