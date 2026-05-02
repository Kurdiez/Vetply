import { chromium } from 'playwright';
import type { BrowserContext } from 'playwright';

export type CovetrusPersistentContextOptions = NonNullable<
  Parameters<typeof chromium.launchPersistentContext>[1]
>;

export const COVETRUS_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export const BROWSER_LAUNCH_TIMEOUT_MS = 90_000;

export const BROWSER_NAVIGATION_DELAY_MS = 800;

export const BROWSER_LAUNCH_ARGS = [
  '--disable-blink-features=AutomationControlled',
  '--disable-features=IsolateOrigins,site-per-process',
  '--disable-site-isolation-trials',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
] as const;

export function buildPersistentContextOptions(): CovetrusPersistentContextOptions {
  return {
    headless: true,
    timeout: BROWSER_LAUNCH_TIMEOUT_MS,
    args: [...BROWSER_LAUNCH_ARGS],
    locale: 'en-GB',
    timezoneId: 'Europe/London',
    userAgent: COVETRUS_USER_AGENT,
    extraHTTPHeaders: {
      'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
    },
    acceptDownloads: false,
  };
}

export async function installAntiDetectionInitScript(
  context: BrowserContext,
): Promise<void> {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-GB', 'en'],
    });
  });
}
