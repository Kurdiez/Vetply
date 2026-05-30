import type { Page } from 'playwright';

import { BROWSER_NAVIGATION_DELAY_MS } from '../covetrus/covetrus-browser-launch';
import { isMwiahProductDetailHref } from './mwiah-category-product-href';
import { isMwiahProductsCollectionResponse } from './mwiah-product-api';
import { resolveMwiahCategoryUrl } from './mwiah-products-menu';
import { gotoMwiahCategoryPage } from './mwiah-scrape-session';
import type { MwiahProductApiCapture } from './mwiah-product-api-capture';
import type { MwiahProductsPagination } from './mwiah-product-api';

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
    await page
      .waitForResponse((res) => isMwiahProductsCollectionResponse(res), {
        timeout: 90_000,
      })
      .catch(() => undefined);
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
  await page
    .waitForResponse((res) => isMwiahProductsCollectionResponse(res), {
      timeout: 60_000,
    })
    .catch(() => undefined);
  await sleep(BROWSER_NAVIGATION_DELAY_MS);
}

export async function loadAllMwiahCategoryListPages(
  page: Page,
  categoryUrl: string,
  capture: MwiahProductApiCapture,
): Promise<{
  listPagesVisited: number;
  pagination: MwiahProductsPagination | null;
}> {
  await gotoMwiahCategoryPage(page, categoryUrl);
  await waitForMwiahCategoryListReady(page, capture);

  let pagination = capture.getPagination();
  let totalPages = pagination?.totalPages ?? 1;
  let listPagesVisited = 1;

  for (let pageNum = 2; pageNum <= totalPages; pageNum += 1) {
    const nextUrl = buildCategoryPageUrl(categoryUrl, pageNum);
    await page.goto(nextUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await waitForCategoryCollectionApi(page);
    listPagesVisited += 1;
    pagination = capture.getPagination() ?? pagination;
    totalPages = pagination?.totalPages ?? totalPages;
  }

  return { listPagesVisited, pagination };
}
