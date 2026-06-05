import type { Page } from 'playwright';

import { BROWSER_NAVIGATION_DELAY_MS } from '../covetrus/covetrus-browser-launch';
import {
  collectMwiahCategoryListPageState,
  saveMwiahCategoryListFailureArtifacts,
} from './mwiah-category-list-debug';
import { isMwiahProductDetailHref } from './mwiah-category-product-href';
import type { MwiahCategoryScrapeTracer } from './mwiah-category-scrape-trace';
import { noopMwiahCategoryScrapeTracer } from './mwiah-category-scrape-trace';
import { isMwiahProductsCollectionResponse } from './mwiah-product-api';
import { gotoMwiahPage } from './mwiah-page-navigation';
import { withMwiahRetries } from './mwiah-playwright-retries';
import { resolveMwiahCategoryUrl } from './mwiah-products-menu';
import { gotoMwiahCategoryPage } from './mwiah-scrape-session';
import type { MwiahProductApiCapture } from './mwiah-product-api-capture';

const PRODUCT_LIST_PAGE = '[data-test-selector="page_ProductListPage"]';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForProductListDomOrProceedFromCapture(
  page: Page,
  capture: MwiahProductApiCapture | undefined,
  trace: MwiahCategoryScrapeTracer,
  pageNumber: number,
): Promise<void> {
  if (capture?.hasCollectionResponses()) {
    trace.step('category_list_dom_wait_skipped_capture_ready', {
      pageNumber,
      currentUrl: page.url(),
    });
    return;
  }

  trace.step('category_list_dom_wait_start', {
    pageNumber,
    currentUrl: page.url(),
  });

  try {
    await page.locator(PRODUCT_LIST_PAGE).waitFor({
      state: 'visible',
      timeout: 60_000,
    });
    trace.step('category_list_dom_wait_done', { pageNumber });
  } catch (error) {
    if (capture?.hasCollectionResponses()) {
      trace.step('category_list_dom_wait_skipped_capture_ready_after_timeout', {
        pageNumber,
        currentUrl: page.url(),
      });
      return;
    }

    const pageState = await collectMwiahCategoryListPageState(page);
    const artifacts = await saveMwiahCategoryListFailureArtifacts(
      page,
      `page-${pageNumber}`,
    );
    trace.step('category_list_dom_wait_failed', {
      pageNumber,
      currentUrl: page.url(),
      pageState,
      ...artifacts,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function waitForMwiahCategoryListReady(
  page: Page,
  capture: MwiahProductApiCapture | undefined,
  trace: MwiahCategoryScrapeTracer,
  pageNumber: number,
): Promise<void> {
  await waitForProductListDomOrProceedFromCapture(
    page,
    capture,
    trace,
    pageNumber,
  );

  const skipApiWait = capture?.hasCollectionResponses() ?? false;
  if (!skipApiWait) {
    trace.step('category_collection_api_wait_start', { pageNumber });
    await page.waitForResponse(
      (res) => isMwiahProductsCollectionResponse(res),
      { timeout: 90_000 },
    );
    trace.step('category_collection_api_wait_done', { pageNumber });
  }

  await sleep(BROWSER_NAVIGATION_DELAY_MS);
}

export async function collectMwiahProductUrlsFromDom(
  page: Page,
  storeOrigin: string,
): Promise<string[]> {
  const hrefs = await page.evaluate(() => {
    const root =
      document.querySelector('[data-test-selector="page_ProductListPage"]') ??
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
  });

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

async function waitForCategoryCollectionApi(
  page: Page,
  trace: MwiahCategoryScrapeTracer,
  pageNumber: number,
): Promise<void> {
  trace.step('category_collection_api_wait_start', { pageNumber });
  await page.waitForResponse((res) => isMwiahProductsCollectionResponse(res), {
    timeout: 60_000,
  });
  trace.step('category_collection_api_wait_done', { pageNumber });
  await sleep(BROWSER_NAVIGATION_DELAY_MS);
}

async function openMwiahCategoryListPageOnce(
  page: Page,
  categoryUrl: string,
  pageNumber: number,
  capture: MwiahProductApiCapture | undefined,
  trace: MwiahCategoryScrapeTracer,
): Promise<void> {
  if (pageNumber === 1) {
    trace.step('category_nav_start', { pageNumber, categoryUrl });
    await gotoMwiahCategoryPage(page, categoryUrl);
    trace.step('category_nav_done', {
      pageNumber,
      currentUrl: page.url(),
    });
    await waitForMwiahCategoryListReady(page, capture, trace, pageNumber);
    return;
  }

  const nextUrl = buildCategoryPageUrl(categoryUrl, pageNumber);
  trace.step('category_nav_start', { pageNumber, categoryUrl: nextUrl });
  await gotoMwiahPage(page, nextUrl);
  trace.step('category_nav_done', { pageNumber, currentUrl: page.url() });
  await waitForCategoryCollectionApi(page, trace, pageNumber);
}

export async function openMwiahCategoryListPage(
  page: Page,
  categoryUrl: string,
  pageNumber: number,
  capture?: MwiahProductApiCapture,
  trace: MwiahCategoryScrapeTracer = noopMwiahCategoryScrapeTracer,
): Promise<void> {
  await withMwiahRetries(
    'category list page open',
    { categoryUrl, pageNumber, currentUrl: page.url() },
    async (attempt) => {
      trace.step('category_list_page_open_attempt_start', {
        pageNumber,
        attempt,
      });
      await openMwiahCategoryListPageOnce(
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
