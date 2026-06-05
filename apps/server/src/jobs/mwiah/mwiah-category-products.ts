import type { Page } from 'playwright';

import {
  isMwiahProductDetailHref,
  parseSupplierProductIdFromProductUrl,
} from './mwiah-category-product-href';
import type { MwiahCategoryScrapeTracer } from './mwiah-category-scrape-trace';
import { noopMwiahCategoryScrapeTracer } from './mwiah-category-scrape-trace';
import {
  openMwiahCategoryListPage,
  resolveListProductsForCurrentPage,
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

export type MwiahCategoryPagePersistResult = {
  imported: number;
  skipped: number;
};

export type ScrapeMwiahCategoryProductsOptions = {
  persistPagePreviews: (
    previews: MwiahProductPreview[],
  ) => Promise<MwiahCategoryPagePersistResult>;
  onListPageProcessed: (stats: {
    pageNumber: number;
    totalPages: number;
    productsProcessed: number;
    imported: number;
    skipped: number;
  }) => void;
  trace?: MwiahCategoryScrapeTracer;
};

export async function scrapeMwiahCategoryProducts(
  page: Page,
  categoryUrl: string,
  storeOrigin: string,
  capture: MwiahProductApiCapture,
  options: ScrapeMwiahCategoryProductsOptions,
): Promise<{
  listPagesVisited: number;
  productsProcessed: number;
  imported: number;
  skipped: number;
}> {
  const trace = options.trace ?? noopMwiahCategoryScrapeTracer;

  trace.step('list_page_open_start', { pageNumber: 1 });
  await openMwiahCategoryListPage(page, categoryUrl, 1, capture, trace);
  let totalPages = capture.getPagination()?.totalPages ?? 1;
  trace.step('list_page_open_done', { pageNumber: 1, totalPages });

  const seenSupplierProductIds = new Set<string>();
  let listPagesVisited = 0;
  let productsProcessed = 0;
  let imported = 0;
  let skipped = 0;

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    if (pageNumber > 1) {
      trace.step('list_page_open_start', { pageNumber });
      await openMwiahCategoryListPage(
        page,
        categoryUrl,
        pageNumber,
        capture,
        trace,
      );
      totalPages = capture.getPagination()?.totalPages ?? totalPages;
      trace.step('list_page_open_done', { pageNumber, totalPages });
    }

    trace.step('list_products_resolve_start', { pageNumber });
    const listProducts = await resolveListProductsForCurrentPage(
      page,
      capture,
      storeOrigin,
      trace,
      pageNumber,
    );

    const workItems = collectCategoryWorkItems(
      listProducts,
      storeOrigin,
      seenSupplierProductIds,
    );
    trace.step('work_items_collected', {
      pageNumber,
      count: workItems.length,
    });

    trace.step('product_details_fetch_start', {
      pageNumber,
      count: workItems.length,
    });
    const pagePreviews = await fetchListingPreviewsForWorkItems(
      page,
      categoryUrl,
      storeOrigin,
      workItems,
    );
    trace.step('product_details_fetch_done', {
      pageNumber,
      previewCount: pagePreviews.length,
    });

    trace.step('persist_start', {
      pageNumber,
      previewCount: pagePreviews.length,
    });
    const persistResult = await options.persistPagePreviews(pagePreviews);
    trace.step('persist_done', {
      pageNumber,
      imported: persistResult.imported,
      skipped: persistResult.skipped,
    });

    productsProcessed += workItems.length;
    imported += persistResult.imported;
    skipped += persistResult.skipped;
    listPagesVisited += 1;

    options.onListPageProcessed({
      pageNumber,
      totalPages,
      productsProcessed: workItems.length,
      imported: persistResult.imported,
      skipped: persistResult.skipped,
    });
  }

  return {
    listPagesVisited,
    productsProcessed,
    imported,
    skipped,
  };
}

export function createMwiahProductApiCapture(): MwiahProductApiCapture {
  return new MwiahProductApiCapture();
}
