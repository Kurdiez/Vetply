import type { Page, Response } from 'playwright';

import { BROWSER_NAVIGATION_DELAY_MS } from '../covetrus/covetrus-browser-launch';
import { onMwiahPageLoaded } from './mwiah-cookie-consent';

export type GotoMwiahPageOptions = {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  timeout?: number;
  rejectHttp5xx?: boolean;
};

const DEFAULT_GOTO_TIMEOUT_MS = 60_000;

export async function gotoMwiahPage(
  page: Page,
  url: string,
  options: GotoMwiahPageOptions = {},
): Promise<Response | null> {
  const {
    waitUntil = 'domcontentloaded',
    timeout = DEFAULT_GOTO_TIMEOUT_MS,
    rejectHttp5xx = false,
  } = options;

  const res = await page.goto(url, { waitUntil, timeout });
  await onMwiahPageLoaded(page);

  if (rejectHttp5xx && res && !res.ok() && res.status() >= 500) {
    throw new Error(`HTTP ${res.status()} loading MWIAH page ${url}`);
  }

  return res;
}

export async function settleMwiahPageAfterNavigation(
  page: Page,
): Promise<void> {
  await page
    .waitForLoadState('networkidle', { timeout: 30_000 })
    .catch(() => undefined);
  await new Promise((resolve) =>
    setTimeout(resolve, BROWSER_NAVIGATION_DELAY_MS),
  );
}
