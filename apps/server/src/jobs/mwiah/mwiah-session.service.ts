import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { Injectable, Logger } from '@nestjs/common';
import type { BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright';

import { ConfigService } from '~/config';

import {
  BROWSER_NAVIGATION_DELAY_MS,
  buildPersistentContextOptions,
  installAntiDetectionInitScript,
} from '../covetrus/covetrus-browser-launch';

const MAX_NAV_ATTEMPTS = 3;
const NAV_RETRY_BASE_MS = 2000;

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
  ): Promise<T> {
    const ephemeralProfileDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'vetply-mwiah-'),
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
        await installAntiDetectionInitScript(context);
        const page = context.pages()[0] ?? (await context.newPage());

        for (let attempt = 1; attempt <= MAX_NAV_ATTEMPTS; attempt += 1) {
          try {
            const res = await page.goto(storeUrl, {
              waitUntil: 'domcontentloaded',
              timeout: 60_000,
            });
            if (res && !res.ok() && res.status() >= 500) {
              throw new Error(`HTTP ${res.status()} loading MWIAH store page`);
            }
            break;
          } catch (err) {
            if (attempt === MAX_NAV_ATTEMPTS) {
              throw err;
            }
            const delay = NAV_RETRY_BASE_MS * attempt;
            this.logger.warn(
              `MWIAH store navigation attempt ${attempt} failed; retrying in ${delay}ms`,
            );
            await sleep(delay);
          }
        }
        await sleep(BROWSER_NAVIGATION_DELAY_MS);

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
