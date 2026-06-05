import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import type { Page } from 'playwright';

import { isSignInPath } from './mwiah-auth-flow';
import { detectCloudflareIndicators } from './mwiah-login-debug';

const BODY_TEXT_PREVIEW_MAX = 800;
const DATA_TEST_SELECTOR_SAMPLE_MAX = 40;
const HTML_SNIPPET_MAX = 8_000;

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

export type MwiahCategoryListFailureArtifacts = {
  screenshotPath: string;
  htmlPath: string;
};

function sanitizeArtifactLabel(label: string): string {
  return label.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
}

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

export async function saveMwiahCategoryListFailureArtifacts(
  page: Page,
  artifactLabel: string,
): Promise<MwiahCategoryListFailureArtifacts> {
  const dir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'vetply-mwiah-category-'),
  );
  const baseName = sanitizeArtifactLabel(artifactLabel);
  const screenshotPath = path.join(dir, `${baseName}.png`);
  const htmlPath = path.join(dir, `${baseName}.html`);

  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {
    // Screenshot may fail if the page is mid-navigation.
  });

  const html = await page.content().catch(() => '');
  const htmlSnippet =
    html.length > HTML_SNIPPET_MAX
      ? `${html.slice(0, HTML_SNIPPET_MAX)}\n<!-- truncated -->`
      : html;
  await fs.writeFile(htmlPath, htmlSnippet, 'utf8');

  return { screenshotPath, htmlPath };
}
