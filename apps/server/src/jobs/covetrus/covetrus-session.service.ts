import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { Injectable, Logger } from '@nestjs/common';
import type { BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright';

import { ConfigService } from '~/config';

import { performCovetrusLogin } from './covetrus-auth-flow';
import {
  BROWSER_NAVIGATION_DELAY_MS,
  buildPersistentContextOptions,
  configureScrapeBrowserContext,
} from '../playwright/scrape-browser-launch';

const MAX_NAV_ATTEMPTS = 3;
const NAV_RETRY_BASE_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class CovetrusSessionService {
  private readonly logger = new Logger(CovetrusSessionService.name);

  constructor(private readonly configService: ConfigService) {}

  /** Each call uses a fresh Chromium user-data dir so parallel scrape jobs never share disk locks. */
  async withCatalogPage<T>(run: (page: Page) => Promise<T>): Promise<T> {
    const username = this.configService.get('COVETRUS_USERNAME');
    const password = this.configService.get('COVETRUS_PASSWORD');
    if (!username?.trim() || !password) {
      throw new Error(
        'COVETRUS_USERNAME and COVETRUS_PASSWORD must be set to run Covetrus scrape jobs',
      );
    }

    const loginUrl = this.configService.get('COVETRUS_LOGIN_URL');
    const orderDetailUrl = this.configService.get('COVETRUS_ORDER_DETAIL_URL');

    const ephemeralProfileDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'vetply-covetrus-'),
    );

    let context: BrowserContext | undefined;
    try {
      try {
        context = await chromium.launchPersistentContext(
          ephemeralProfileDir,
          buildPersistentContextOptions(),
        );
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

        await performCovetrusLogin({
          page,
          loginUrl,
          username: username.trim(),
          password,
        });

        for (let attempt = 1; attempt <= MAX_NAV_ATTEMPTS; attempt += 1) {
          try {
            const res = await page.goto(orderDetailUrl, {
              waitUntil: 'domcontentloaded',
              timeout: 60_000,
            });
            if (res && !res.ok() && res.status() >= 500) {
              throw new Error(`HTTP ${res.status()} loading catalog page`);
            }
            const landed = page.url();
            const onLoginPath =
              new URL(landed).pathname.replace(/\/$/, '') === '/login' ||
              /\/login(?:\/|$)/i.test(new URL(landed).pathname);
            if (onLoginPath) {
              throw new Error(
                `Covetrus catalog navigation redirected to login (${landed}). ` +
                  `Use COVETRUS_LOGIN_URL on the same site as COVETRUS_ORDER_DETAIL_URL ` +
                  `(e.g. https://connect.covetrus.co.uk/login for connect.covetrus.co.uk order URLs).`,
              );
            }
            break;
          } catch (err) {
            const msg = String(err);
            if (
              msg.includes('Covetrus catalog navigation redirected to login')
            ) {
              throw err;
            }
            if (attempt === MAX_NAV_ATTEMPTS) {
              throw err;
            }
            const delay = NAV_RETRY_BASE_MS * attempt;
            this.logger.warn(
              `Covetrus order page navigation attempt ${attempt} failed; retrying in ${delay}ms`,
            );
            await sleep(delay);
          }
        }
        await sleep(BROWSER_NAVIGATION_DELAY_MS);

        return await run(page);
      } finally {
        await context.close().catch((err: unknown) => {
          this.logger.warn(`Covetrus browser context close: ${String(err)}`);
        });
      }
    } finally {
      await fs
        .rm(ephemeralProfileDir, { recursive: true, force: true })
        .catch((err: unknown) => {
          this.logger.warn(
            `Covetrus ephemeral profile cleanup: ${String(err)}`,
          );
        });
    }
  }
}
