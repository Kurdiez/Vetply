import type { Page } from 'playwright';

import {
  isMwiahProductDetailHref,
  parseSupplierProductIdFromProductUrl,
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
import type { MwiahProductPreview } from './mwiah-product.types';
import { resolveMwiahCategoryUrl } from './mwiah-products-menu';
import { buildMwiahSupplierListingPreview } from './mwiah-supplier-listing-rest-parse';
import { normalizeMwiahSupplierProductId } from './mwiah-supplier-product-id';

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
  seenSupplierProductIds: Set<string>,
): { listItem: Record<string, unknown>; productUrl: string }[] {
  const workItems: { listItem: Record<string, unknown>; productUrl: string }[] =
    [];

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

async function fetchListingPreviewsForWorkItems(
  page: Page,
  categoryUrl: string,
  storeOrigin: string,
  workItems: { listItem: Record<string, unknown>; productUrl: string }[],
): Promise<MwiahProductPreview[]> {
  const results = await Promise.all(
    workItems.map(({ listItem, productUrl }) =>
      fetchListingPreviewFromRest(
        page,
        categoryUrl,
        storeOrigin,
        listItem,
        productUrl,
      ),
    ),
  );

  const previews: MwiahProductPreview[] = [];
  for (const result of results) {
    if (typeof result !== 'string') {
      previews.push(result);
    }
  }
  return previews;
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

  const listProductPages = capture.drainCollectionProductPages();
  const domFallbackPages =
    listProductPages.length === 0
      ? [
          (await collectMwiahProductUrlsFromDom(page, storeOrigin)).map(
            (url) => ({ canonicalUrl: url }),
          ),
        ]
      : listProductPages;

  const seenSupplierProductIds = new Set<string>();
  const previews: MwiahProductPreview[] = [];
  let productsDiscovered = 0;

  for (const listProducts of domFallbackPages) {
    const workItems = collectCategoryWorkItems(
      listProducts,
      storeOrigin,
      seenSupplierProductIds,
    );
    productsDiscovered += workItems.length;
    const pagePreviews = await fetchListingPreviewsForWorkItems(
      page,
      categoryUrl,
      storeOrigin,
      workItems,
    );
    previews.push(...pagePreviews);
  }

  return {
    previews,
    listPagesVisited,
    productsDiscovered,
  };
}

export function createMwiahProductApiCapture(): MwiahProductApiCapture {
  return new MwiahProductApiCapture();
}
