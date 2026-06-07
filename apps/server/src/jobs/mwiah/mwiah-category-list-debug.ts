import type { Page } from 'playwright';

import { isSignInPath } from './mwiah-auth-flow';
import { detectCloudflareIndicators } from './mwiah-login-debug';

const BODY_TEXT_PREVIEW_MAX = 800;
const DATA_TEST_SELECTOR_SAMPLE_MAX = 40;
const HTML_SNIPPET_LOG_MAX = 4_000;

export type MwiahCategoryListPageState = {
  href: string;
  title: string;
  productListPagePresent: boolean;
  productListPageVisible: boolean;
  reactAppPresent: boolean;
  onSignInPath: boolean;
  cloudflareIndicators: boolean;
  dataTestSelectors: string[];
  bodyTextPreview: string;
  productDetailLinkCount: number;
};

export type MwiahCategoryListFailureLogContext = {
  pageState: MwiahCategoryListPageState;
  htmlSnippetPreview: string | null;
};

export async function collectMwiahCategoryListPageState(
  page: Page,
): Promise<MwiahCategoryListPageState> {
  const productListLocator = page.locator(
    '[data-test-selector="page_ProductListPage"]',
  );
  const productListPageVisible = await productListLocator
    .first()
    .isVisible()
    .catch(() => false);

  const domState = await page.evaluate(
    (limits: { bodyTextPreviewMax: number; selectorSampleMax: number }) => {
      const bodyText = (document.body?.innerText ?? '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, limits.bodyTextPreviewMax);

      const dataTestSelectors = Array.from(
        document.querySelectorAll('[data-test-selector]'),
      )
        .map((el) => el.getAttribute('data-test-selector'))
        .filter((value): value is string => !!value?.trim())
        .slice(0, limits.selectorSampleMax);

      const productDetailLinkCount = Array.from(
        document.querySelectorAll('a[href*="/Product/"]'),
      ).length;

      return {
        href: location.href,
        title: document.title,
        productListPagePresent: !!document.querySelector(
          '[data-test-selector="page_ProductListPage"]',
        ),
        reactAppPresent: !!document.getElementById('react-app'),
        bodyTextPreview: bodyText,
        dataTestSelectors,
        productDetailLinkCount,
      };
    },
    {
      bodyTextPreviewMax: BODY_TEXT_PREVIEW_MAX,
      selectorSampleMax: DATA_TEST_SELECTOR_SAMPLE_MAX,
    },
  );

  return {
    ...domState,
    productListPageVisible,
    onSignInPath: isSignInPath(domState.href),
    cloudflareIndicators: detectCloudflareIndicators(
      domState.title,
      domState.bodyTextPreview,
    ),
  };
}

async function readHtmlSnippetPreview(page: Page): Promise<string | null> {
  const html = await page.content().catch(() => '');
  if (html === '') {
    return null;
  }
  if (html.length <= HTML_SNIPPET_LOG_MAX) {
    return html;
  }
  return `${html.slice(0, HTML_SNIPPET_LOG_MAX)}\n<!-- truncated -->`;
}

export async function collectMwiahCategoryListFailureLogContext(
  page: Page,
): Promise<MwiahCategoryListFailureLogContext> {
  const [pageState, htmlSnippetPreview] = await Promise.all([
    collectMwiahCategoryListPageState(page),
    readHtmlSnippetPreview(page),
  ]);

  return { pageState, htmlSnippetPreview };
}
