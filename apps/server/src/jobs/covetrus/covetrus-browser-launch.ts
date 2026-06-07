export {
  BROWSER_LAUNCH_ARGS,
  BROWSER_LAUNCH_TIMEOUT_MS,
  BROWSER_NAVIGATION_DELAY_MS,
  buildPersistentContextOptions,
  configureScrapeBrowserContext,
  installAntiDetectionInitScript,
  installImageBlocking,
  SCRAPE_USER_AGENT,
  type ScrapePersistentContextOptions,
} from '../playwright/scrape-browser-launch';

/** @deprecated Use ScrapePersistentContextOptions */
export type { ScrapePersistentContextOptions as CovetrusPersistentContextOptions } from '../playwright/scrape-browser-launch';

/** @deprecated Use SCRAPE_USER_AGENT */
export { SCRAPE_USER_AGENT as COVETRUS_USER_AGENT } from '../playwright/scrape-browser-launch';
