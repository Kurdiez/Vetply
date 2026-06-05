import type { Page } from 'playwright';

import { BROWSER_NAVIGATION_DELAY_MS } from '../covetrus/covetrus-browser-launch';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const COOKIE_BANNER_WAIT_MS = 5_000;

export async function onMwiahPageLoaded(page: Page): Promise<void> {
  await dismissMwiahCookieConsentIfPresent(page);
}

export async function dismissMwiahCookieConsentIfPresent(
  page: Page,
): Promise<void> {
  const acceptButton = page
    .locator('#onetrust-accept-btn-handler')
    .or(page.getByRole('button', { name: /Accept All Cookies/i }))
    .or(page.locator('button:has-text("Accept All Cookies")'))
    .first();

  try {
    await acceptButton.waitFor({
      state: 'visible',
      timeout: COOKIE_BANNER_WAIT_MS,
    });
    await acceptButton.click({ timeout: 5_000 });
    await sleep(BROWSER_NAVIGATION_DELAY_MS);
  } catch {
    // OneTrust banner not shown — ignore
  }
}
