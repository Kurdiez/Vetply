import type { Page } from 'playwright';

import { BROWSER_NAVIGATION_DELAY_MS } from '../playwright/scrape-browser-launch';
import {
  readMwiahCatalogPageKind,
  MWIAH_PRODUCT_LIST_PAGE_SELECTOR,
} from './mwiah-catalog-page-kind';
import { collectMwiahCategoryListFailureLogContext } from './mwiah-category-list-debug';
import { isMwiahProductDetailHref } from './mwiah-category-product-href';
import type { MwiahCategoryScrapeTracer } from './mwiah-category-scrape-trace';
import { noopMwiahCategoryScrapeTracer } from './mwiah-category-scrape-trace';
import { isMwiahProductsCollectionResponse } from './mwiah-product-api';
import { gotoMwiahPage } from './mwiah-page-navigation';
import { withMwiahRetries } from './mwiah-playwright-retries';
import { resolveMwiahCategoryUrl } from './mwiah-products-menu';
import { gotoMwiahCategoryPage } from './mwiah-scrape-session';
import type { MwiahProductApiCapture } from './mwiah-product-api-capture';

export type OpenMwiahProductListPageResult =
  | { status: 'ready' }
  | { status: 'category_details'; currentUrl: string };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForMwiahCatalogPageKind(
  page: Page,
  trace: MwiahCategoryScrapeTracer,
  pageNumber: number,
): Promise<OpenMwiahProductListPageResult> {
  trace.step('catalog_page_kind_wait_start', {
    pageNumber,
    currentUrl: page.url(),
  });

  try {
    await page.waitForFunction(
      ([productListSelector, categoryDetailsSelector]) => {
        return (
          !!document.querySelector(productListSelector) ||
          !!document.querySelector(categoryDetailsSelector)
        );
      },
      [
        MWIAH_PRODUCT_LIST_PAGE_SELECTOR,
        '[data-test-selector="page_CategoryDetailsPage"]',
      ],
      { timeout: 60_000 },
    );
  } catch (error) {
    const failureLogContext =
      await collectMwiahCategoryListFailureLogContext(page);
    trace.step('catalog_page_kind_wait_failed', {
      pageNumber,
      currentUrl: page.url(),
      ...failureLogContext,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  const kind = await readMwiahCatalogPageKind(page);
  trace.step('catalog_page_kind_wait_done', {
    pageNumber,
    kind,
    currentUrl: page.url(),
  });

  if (kind === 'category_details') {
    return { status: 'category_details', currentUrl: page.url() };
  }

  if (kind !== 'product_list') {
    throw new Error(
      `MWIAH catalog page kind could not be resolved at ${page.url()}`,
    );
  }

  return { status: 'ready' };
}

async function waitForProductListCollectionApi(
  page: Page,
  capture: MwiahProductApiCapture | undefined,
  trace: MwiahCategoryScrapeTracer,
  pageNumber: number,
): Promise<void> {
  if (capture?.hasCollectionResponses()) {
    trace.step('category_collection_api_wait_skipped_capture_ready', {
      pageNumber,
    });
    await sleep(BROWSER_NAVIGATION_DELAY_MS);
    return;
  }

  trace.step('category_collection_api_wait_start', { pageNumber });
  await page.waitForResponse((res) => isMwiahProductsCollectionResponse(res), {
    timeout: 90_000,
  });
  trace.step('category_collection_api_wait_done', { pageNumber });
  await sleep(BROWSER_NAVIGATION_DELAY_MS);
}

async function openFirstMwiahProductListPage(
  page: Page,
  categoryUrl: string,
  capture: MwiahProductApiCapture | undefined,
  trace: MwiahCategoryScrapeTracer,
): Promise<OpenMwiahProductListPageResult> {
  trace.step('category_nav_start', { pageNumber: 1, categoryUrl });
  await gotoMwiahCategoryPage(page, categoryUrl);
  trace.step('category_nav_done', {
    pageNumber: 1,
    currentUrl: page.url(),
  });

  const pageKind = await waitForMwiahCatalogPageKind(page, trace, 1);
  if (pageKind.status === 'category_details') {
    trace.step('category_details_page_skipped', {
      pageNumber: 1,
      currentUrl: pageKind.currentUrl,
    });
    return pageKind;
  }

  await waitForProductListCollectionApi(page, capture, trace, 1);
  return { status: 'ready' };
}

export async function collectMwiahProductUrlsFromDom(
  page: Page,
  storeOrigin: string,
): Promise<string[]> {
  const hrefs = await page.evaluate((productListSelector) => {
    const root =
      document.querySelector(productListSelector) ??
      document.getElementById('react-app');
    if (!root) {
      return [] as string[];
    }
    const out: string[] = [];
    for (const anchor of root.querySelectorAll('a[href]')) {
      const href = anchor.getAttribute('href');
      if (href) {
        out.push(href);
      }
    }
    return out;
  }, MWIAH_PRODUCT_LIST_PAGE_SELECTOR);

  const urls: string[] = [];
  for (const href of hrefs) {
    if (!isMwiahProductDetailHref(href)) {
      continue;
    }
    urls.push(resolveMwiahCategoryUrl(href, storeOrigin));
  }
  return [...new Set(urls)];
}

function buildCategoryPageUrl(categoryUrl: string, pageNumber: number): string {
  const url = new URL(categoryUrl);
  url.searchParams.set('page', String(pageNumber));
  return url.toString();
}

async function openMwiahProductListPaginationPage(
  page: Page,
  categoryUrl: string,
  pageNumber: number,
  capture: MwiahProductApiCapture | undefined,
  trace: MwiahCategoryScrapeTracer,
): Promise<void> {
  const nextUrl = buildCategoryPageUrl(categoryUrl, pageNumber);
  trace.step('category_nav_start', { pageNumber, categoryUrl: nextUrl });
  await gotoMwiahPage(page, nextUrl);
  trace.step('category_nav_done', { pageNumber, currentUrl: page.url() });
  await waitForProductListCollectionApi(page, capture, trace, pageNumber);
}

export async function openMwiahCategoryListPage(
  page: Page,
  categoryUrl: string,
  pageNumber: number,
  capture?: MwiahProductApiCapture,
  trace: MwiahCategoryScrapeTracer = noopMwiahCategoryScrapeTracer,
): Promise<OpenMwiahProductListPageResult> {
  if (pageNumber === 1) {
    return openFirstMwiahProductListPage(page, categoryUrl, capture, trace);
  }

  await withMwiahRetries(
    'category list page open',
    { categoryUrl, pageNumber, currentUrl: page.url() },
    async (attempt) => {
      trace.step('category_list_page_open_attempt_start', {
        pageNumber,
        attempt,
      });
      await openMwiahProductListPaginationPage(
        page,
        categoryUrl,
        pageNumber,
        capture,
        trace,
      );
      trace.step('category_list_page_open_attempt_done', {
        pageNumber,
        attempt,
        currentUrl: page.url(),
      });
    },
  );

  return { status: 'ready' };
}

export async function resolveListProductsForCurrentPage(
  page: Page,
  capture: MwiahProductApiCapture,
  storeOrigin: string,
  trace: MwiahCategoryScrapeTracer = noopMwiahCategoryScrapeTracer,
  pageNumber?: number,
): Promise<Record<string, unknown>[]> {
  const fromCapture = capture.takeLatestCollectionProductPage();
  if (fromCapture.length > 0) {
    trace.step('list_products_resolved', {
      pageNumber: pageNumber ?? null,
      count: fromCapture.length,
      source: 'capture',
    });
    return fromCapture;
  }

  trace.step('list_products_dom_fallback_start', {
    pageNumber: pageNumber ?? null,
  });
  const urls = await collectMwiahProductUrlsFromDom(page, storeOrigin);
  trace.step('list_products_resolved', {
    pageNumber: pageNumber ?? null,
    count: urls.length,
    source: 'dom',
  });
  return urls.map((url) => ({ canonicalUrl: url }));
}
