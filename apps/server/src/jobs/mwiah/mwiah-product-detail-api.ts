import type { Page } from 'playwright';

import { withMwiahRetries } from './mwiah-playwright-retries';
import { resolveMwiahCategoryUrl } from './mwiah-products-menu';

const SINGLE_PRODUCT_API_PATH = /\/api\/v\d+\/products\/[^/?]+/i;
const PRODUCT_DETAIL_REQUEST_TIMEOUT_MS = 30_000;

function pickString(value: unknown): string | null {
  if (typeof value === 'string') {
    const t = value.trim();
    return t === '' ? null : t;
  }
  return null;
}

export function withMwiahProductDetailQueryParams(apiUrl: string): string {
  const url = new URL(apiUrl);
  url.searchParams.set(
    'expand',
    'detail,specifications,content,images,documents,attributes,variantTraits,badges',
  );
  url.searchParams.set('includeAttributes', 'includeOnProduct,notFromCategory');
  url.searchParams.set('addToRecentlyViewed', 'true');
  return url.toString();
}

export function resolveMwiahProductDetailApiUrl(
  listItem: Record<string, unknown>,
  storeOrigin: string,
): string | null {
  const uri = pickString(listItem.uri);
  if (uri && SINGLE_PRODUCT_API_PATH.test(uri)) {
    return withMwiahProductDetailQueryParams(
      uri.startsWith('http') ? uri : resolveMwiahCategoryUrl(uri, storeOrigin),
    );
  }

  const productUri = pickString(listItem.productUri);
  if (productUri && SINGLE_PRODUCT_API_PATH.test(productUri)) {
    return withMwiahProductDetailQueryParams(
      productUri.startsWith('http')
        ? productUri
        : resolveMwiahCategoryUrl(productUri, storeOrigin),
    );
  }

  const id = pickString(listItem.id);
  if (id) {
    return withMwiahProductDetailQueryParams(
      `${storeOrigin}/api/v2/products/${encodeURIComponent(id)}`,
    );
  }

  const erp =
    pickString(listItem.erpNumber) ?? pickString(listItem.productNumber);
  if (erp) {
    return withMwiahProductDetailQueryParams(
      `${storeOrigin}/api/v2/products/${encodeURIComponent(erp)}`,
    );
  }

  return null;
}

async function fetchMwiahProductDetailBodyOnce(
  page: Page,
  apiUrl: string,
): Promise<string | null> {
  const res = await page.request.get(apiUrl, {
    timeout: PRODUCT_DETAIL_REQUEST_TIMEOUT_MS,
  });
  if (!res.ok()) {
    throw new Error(
      `MWIAH product detail request failed with HTTP ${res.status()} for ${apiUrl}`,
    );
  }
  return res.text();
}

export async function fetchMwiahProductDetailBody(
  page: Page,
  apiUrl: string,
): Promise<string | null> {
  return withMwiahRetries('product detail fetch', { apiUrl }, async () =>
    fetchMwiahProductDetailBodyOnce(page, apiUrl),
  );
}
