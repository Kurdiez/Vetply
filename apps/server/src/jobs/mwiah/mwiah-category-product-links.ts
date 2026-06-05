import type { Page } from 'playwright';

import { BROWSER_NAVIGATION_DELAY_MS } from '../covetrus/covetrus-browser-launch';
import { isMwiahProductDetailHref } from './mwiah-category-product-href';
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

async function waitForMwiahCategoryListReady(
  page: Page,
  capture?: MwiahProductApiCapture,
): Promise<void> {
  await page.locator(PRODUCT_LIST_PAGE).waitFor({
    state: 'visible',
    timeout: 60_000,
  });

  const skipApiWait = capture?.hasCollectionResponses() ?? false;
  if (!skipApiWait) {
    await page.waitForResponse(
      (res) => isMwiahProductsCollectionResponse(res),
      { timeout: 90_000 },
    );
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

async function waitForCategoryCollectionApi(page: Page): Promise<void> {
  await page.waitForResponse((res) => isMwiahProductsCollectionResponse(res), {
    timeout: 60_000,
  });
  await sleep(BROWSER_NAVIGATION_DELAY_MS);
}

async function openMwiahCategoryListPageOnce(
  page: Page,
  categoryUrl: string,
  pageNumber: number,
  capture?: MwiahProductApiCapture,
): Promise<void> {
  if (pageNumber === 1) {
    await gotoMwiahCategoryPage(page, categoryUrl);
    await waitForMwiahCategoryListReady(page, capture);
    return;
  }

  const nextUrl = buildCategoryPageUrl(categoryUrl, pageNumber);
  await gotoMwiahPage(page, nextUrl);
  await waitForCategoryCollectionApi(page);
}

export async function openMwiahCategoryListPage(
  page: Page,
  categoryUrl: string,
  pageNumber: number,
  capture?: MwiahProductApiCapture,
): Promise<void> {
  await withMwiahRetries(
    'category list page open',
    { categoryUrl, pageNumber, currentUrl: page.url() },
    async () => {
      await openMwiahCategoryListPageOnce(
        page,
        categoryUrl,
        pageNumber,
        capture,
      );
    },
  );
}

export async function resolveListProductsForCurrentPage(
  page: Page,
  capture: MwiahProductApiCapture,
  storeOrigin: string,
): Promise<Record<string, unknown>[]> {
  const fromCapture = capture.takeLatestCollectionProductPage();
  if (fromCapture.length > 0) {
    return fromCapture;
  }

  const urls = await collectMwiahProductUrlsFromDom(page, storeOrigin);
  return urls.map((url) => ({ canonicalUrl: url }));
}
