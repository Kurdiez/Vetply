import type { Page } from 'playwright';

import {
  parseSupplierProductIdFromProductUrl,
  isMwiahProductDetailHref,
} from './mwiah-category-product-href';
import {
  collectMwiahProductUrlsFromDom,
  loadAllMwiahCategoryListPages,
} from './mwiah-category-product-links';
import { MwiahProductApiCapture } from './mwiah-product-api-capture';
import {
  fetchMwiahProductDetailBody,
  resolveMwiahProductDetailApiUrl,
} from './mwiah-product-detail-api';
import { buildMwiahSupplierListingPreview } from './mwiah-supplier-listing-rest-parse';
import { normalizeMwiahSupplierProductId } from './mwiah-supplier-product-id';
import { resolveMwiahCategoryUrl } from './mwiah-products-menu';
import type { MwiahProductPreview } from './mwiah-product.types';

function resolveListItemProductUrl(
  item: Record<string, unknown>,
  storeOrigin: string,
): string | null {
  for (const key of ['canonicalUrl', 'url', 'productDetailUrl']) {
    const raw = item[key];
    if (typeof raw === 'string' && isMwiahProductDetailHref(raw)) {
      return raw.startsWith('http')
        ? raw
        : resolveMwiahCategoryUrl(raw, storeOrigin);
    }
  }
  return null;
}

function resolveWorkItemSupplierProductId(
  listItem: Record<string, unknown>,
  productUrl: string,
): string | null {
  for (const key of ['erpNumber', 'productNumber', 'sku'] as const) {
    const raw = listItem[key];
    if (typeof raw === 'string' && raw.trim() !== '') {
      return normalizeMwiahSupplierProductId(raw);
    }
  }
  const fromUrl = parseSupplierProductIdFromProductUrl(productUrl);
  return fromUrl ? normalizeMwiahSupplierProductId(fromUrl) : null;
}

async function fetchListingPreviewFromRest(
  page: Page,
  categoryUrl: string,
  storeOrigin: string,
  listItem: Record<string, unknown>,
  productUrl: string,
): Promise<MwiahProductPreview | string> {
  const apiUrl = resolveMwiahProductDetailApiUrl(listItem, storeOrigin);
  const detailBody = apiUrl
    ? await fetchMwiahProductDetailBody(page, apiUrl)
    : null;

  return buildMwiahSupplierListingPreview({
    categoryUrl,
    storeOrigin,
    listItem,
    detailBody,
    productUrlOverride: productUrl,
  });
}

function collectCategoryWorkItems(
  listProducts: Record<string, unknown>[],
  storeOrigin: string,
): { listItem: Record<string, unknown>; productUrl: string }[] {
  const workItems: { listItem: Record<string, unknown>; productUrl: string }[] =
    [];
  const seenSupplierProductIds = new Set<string>();

  for (const item of listProducts) {
    const productUrl = resolveListItemProductUrl(item, storeOrigin);
    if (!productUrl) {
      continue;
    }
    const supplierProductId = resolveWorkItemSupplierProductId(
      item,
      productUrl,
    );
    if (!supplierProductId || seenSupplierProductIds.has(supplierProductId)) {
      continue;
    }
    seenSupplierProductIds.add(supplierProductId);
    workItems.push({ listItem: item, productUrl });
  }

  return workItems;
}

export async function scrapeMwiahCategoryProducts(
  page: Page,
  categoryUrl: string,
  storeOrigin: string,
  capture: MwiahProductApiCapture,
): Promise<{
  previews: MwiahProductPreview[];
  listPagesVisited: number;
  productsDiscovered: number;
}> {
  const { listPagesVisited } = await loadAllMwiahCategoryListPages(
    page,
    categoryUrl,
    capture,
  );

  let listProducts = capture.drainCollectionProducts();
  if (listProducts.length === 0) {
    const domUrls = await collectMwiahProductUrlsFromDom(page, storeOrigin);
    listProducts = domUrls.map((url) => ({ canonicalUrl: url }));
  }

  const workItems = collectCategoryWorkItems(listProducts, storeOrigin);

  const previews: MwiahProductPreview[] = [];
  for (const { listItem, productUrl } of workItems) {
    const result = await fetchListingPreviewFromRest(
      page,
      categoryUrl,
      storeOrigin,
      listItem,
      productUrl,
    );
    if (typeof result === 'string') {
      continue;
    }
    previews.push(result);
  }

  return {
    previews,
    listPagesVisited,
    productsDiscovered: workItems.length,
  };
}

export function createMwiahProductApiCapture(): MwiahProductApiCapture {
  return new MwiahProductApiCapture();
}
