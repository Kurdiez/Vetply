import type { Page } from 'playwright';

import { BROWSER_NAVIGATION_DELAY_MS } from '../covetrus/covetrus-browser-launch';
import { performMwiahLogin } from './mwiah-auth-flow';
import { dismissMwiahCookieConsentIfPresent } from './mwiah-cookie-consent';
import type { MwiahLoginDebugContext } from './mwiah-login-debug';
import type { MwiahSessionService } from './mwiah-session.service';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runWithAuthenticatedMwiahPage<T>(
  session: MwiahSessionService,
  storeUrl: string,
  run: (page: Page) => Promise<T>,
  debugContext?: MwiahLoginDebugContext,
): Promise<T> {
  const { username, password } = session.getCredentials();

  return session.withStorePage(
    storeUrl,
    async (page) => {
      await performMwiahLogin({
        page,
        username,
        password,
        debugContext,
      });
      await dismissMwiahCookieConsentIfPresent(page);
      return run(page);
    },
    debugContext,
  );
}

export async function gotoMwiahCategoryPage(
  page: Page,
  categoryUrl: string,
): Promise<void> {
  const res = await page.goto(categoryUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  if (res && !res.ok() && res.status() >= 500) {
    throw new Error(`HTTP ${res.status()} loading MWIAH category page`);
  }
  await sleep(BROWSER_NAVIGATION_DELAY_MS);
  await page
    .waitForLoadState('networkidle', { timeout: 30_000 })
    .catch(() => undefined);
}
