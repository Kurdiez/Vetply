import type { Page } from 'playwright';

import { performMwiahLogin } from './mwiah-auth-flow';
import type { MwiahLoginDebugContext } from './mwiah-login-debug';
import {
  gotoMwiahPage,
  settleMwiahPageAfterNavigation,
} from './mwiah-page-navigation';
import type { MwiahSessionService } from './mwiah-session.service';

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
      return run(page);
    },
    debugContext,
  );
}

export async function gotoMwiahCategoryPage(
  page: Page,
  categoryUrl: string,
): Promise<void> {
  await gotoMwiahPage(page, categoryUrl, { rejectHttp5xx: true });
  await settleMwiahPageAfterNavigation(page);
}
