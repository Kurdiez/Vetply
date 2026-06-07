import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { Injectable, Logger } from '@nestjs/common';
import type { BrowserContext, Page, Response } from 'playwright';
import { chromium } from 'playwright';

import { ConfigService } from '~/config';

import {
  BROWSER_NAVIGATION_DELAY_MS,
  buildPersistentContextOptions,
  configureScrapeBrowserContext,
} from '../playwright/scrape-browser-launch';
import {
  collectLoginPageState,
  extractCfRayFromResponse,
  inferHypothesesFromPageState,
  logMwiahLoginDebug,
  MWIAH_LOGIN_HYPOTHESES,
  type MwiahLoginDebugContext,
} from './mwiah-login-debug';
import { isSignInPath } from './mwiah-auth-flow';
import { gotoMwiahPage } from './mwiah-page-navigation';
import { withMwiahRetries } from './mwiah-playwright-retries';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class MwiahSessionService {
  private readonly logger = new Logger(MwiahSessionService.name);

  constructor(private readonly configService: ConfigService) {}

  getCredentials(): { username: string; password: string } {
    const username = this.configService.get('MWIAH_USERNAME');
    const password = this.configService.get('MWIAH_PASSWORD');
    if (!username?.trim() || !password) {
      throw new Error(
        'MWIAH_USERNAME and MWIAH_PASSWORD must be set to run MWIAH scrape jobs',
      );
    }
    return { username: username.trim(), password };
  }

  getDefaultStoreUrl(): string {
    return this.configService.get('MWIAH_STORE_URL');
  }

  getStoreOrigin(): string {
    return new URL(this.getDefaultStoreUrl()).origin;
  }

  async withStorePage<T>(
    storeUrl: string,
    run: (page: Page) => Promise<T>,
    debugContext: MwiahLoginDebugContext = {},
  ): Promise<T> {
    const ephemeralProfileDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'vetply-mwiah-'),
    );

    let context: BrowserContext | undefined;
    try {
      debugContext.trace?.step('browser_session_start', { storeUrl });

      logMwiahLoginDebug({
        event: 'browser_session_start',
        hypotheses: [MWIAH_LOGIN_HYPOTHESES.CONCURRENT_LOGIN],
        context: debugContext,
        data: { storeUrl },
      });

      try {
        debugContext.trace?.step('browser_launch_start', { storeUrl });
        context = await chromium.launchPersistentContext(
          ephemeralProfileDir,
          buildPersistentContextOptions(),
        );
        debugContext.trace?.step('browser_launch_done', { storeUrl });
      } catch (err) {
        const message = String(err);
        if (message.includes("Executable doesn't exist")) {
          throw new Error(
            `Playwright browser binaries are missing. From the repo root run: yarn workspace @vetply/server playwright:install. Underlying: ${message}`,
          );
        }
        throw err;
      }

      try {
        await configureScrapeBrowserContext(context);
        const page = context.pages()[0] ?? (await context.newPage());

        let storeResponse: Response | null = null;
        storeResponse = await withMwiahRetries(
          'store navigation',
          { storeUrl, ...debugContext },
          async (attempt) => {
            debugContext.trace?.step('store_nav_attempt_start', {
              storeUrl,
              attempt,
            });
            try {
              const response = await gotoMwiahPage(page, storeUrl);
              if (response && !response.ok() && response.status() >= 500) {
                throw new Error(
                  `HTTP ${response.status()} loading MWIAH store page`,
                );
              }
              debugContext.trace?.step('store_nav_attempt_done', {
                storeUrl,
                attempt,
                currentUrl: page.url(),
              });
              return response;
            } catch (err) {
              if (attempt >= 3) {
                const pageState = await collectLoginPageState(page).catch(
                  () => null,
                );
                logMwiahLoginDebug({
                  event: 'store_nav_failed',
                  hypotheses: [
                    MWIAH_LOGIN_HYPOTHESES.NAV_RACE,
                    MWIAH_LOGIN_HYPOTHESES.CLOUDFLARE_CHALLENGE,
                    MWIAH_LOGIN_HYPOTHESES.WRONG_PAGE,
                  ],
                  context: debugContext,
                  data: {
                    storeUrl,
                    attempt,
                    error: String(err),
                    pageState,
                  },
                });
              }
              throw err;
            }
          },
        );
        await sleep(BROWSER_NAVIGATION_DELAY_MS);

        const pageState = await collectLoginPageState(page);
        logMwiahLoginDebug({
          event: 'store_nav_complete',
          hypotheses: [
            MWIAH_LOGIN_HYPOTHESES.NAV_RACE,
            MWIAH_LOGIN_HYPOTHESES.WRONG_PAGE,
            MWIAH_LOGIN_HYPOTHESES.CLOUDFLARE_CHALLENGE,
          ],
          context: debugContext,
          data: {
            storeUrl,
            currentUrl: page.url(),
            responseStatus: storeResponse?.status() ?? null,
            cfRay: extractCfRayFromResponse(storeResponse),
            onSignInPath: isSignInPath(page.url()),
            pageState,
            inferredHypotheses: inferHypothesesFromPageState(
              pageState,
              isSignInPath(page.url()),
            ),
          },
        });

        debugContext.trace?.step('session_handoff_to_runner', {
          currentUrl: page.url(),
        });
        return await run(page);
      } finally {
        await context.close().catch((err: unknown) => {
          this.logger.warn(`MWIAH browser context close: ${String(err)}`);
        });
      }
    } finally {
      await fs
        .rm(ephemeralProfileDir, { recursive: true, force: true })
        .catch((err: unknown) => {
          this.logger.warn(`MWIAH ephemeral profile cleanup: ${String(err)}`);
        });
    }
  }
}
