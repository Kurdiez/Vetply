import type { Page, Response } from 'playwright';

import { BROWSER_NAVIGATION_DELAY_MS } from '../covetrus/covetrus-browser-launch';
import { onMwiahPageLoaded } from './mwiah-cookie-consent';
import {
  collectLoginPageState,
  extractCfRayFromResponse,
  inferHypothesesFromPageState,
  logMwiahLoginDebug,
  MWIAH_LOGIN_HYPOTHESES,
  type MwiahLoginDebugContext,
} from './mwiah-login-debug';
import { gotoMwiahPage } from './mwiah-page-navigation';
import { withMwiahRetries } from './mwiah-playwright-retries';
import { MWIAH_SIGN_IN_URL } from './mwiah-urls';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isSignInPath(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.replace(/\/$/, '') || '/';
    return pathname.toLowerCase() === '/signin';
  } catch {
    return /\/signin(?:\/|$)/i.test(url);
  }
}

async function ensureOnSignInPage(
  page: Page,
  debugContext: MwiahLoginDebugContext,
): Promise<void> {
  debugContext.trace?.step('signin_ensure_start', { currentUrl: page.url() });
  const currentUrl = page.url();
  const alreadyOnSignIn = isSignInPath(currentUrl);

  logMwiahLoginDebug({
    event: 'signin_check',
    hypotheses: [
      MWIAH_LOGIN_HYPOTHESES.NAV_RACE,
      MWIAH_LOGIN_HYPOTHESES.WRONG_PAGE,
    ],
    context: debugContext,
    data: { currentUrl, alreadyOnSignIn },
  });

  if (alreadyOnSignIn) {
    debugContext.trace?.step('signin_already_on_page', { currentUrl });
    await onMwiahPageLoaded(page);
    debugContext.trace?.step('signin_ensure_done', { currentUrl: page.url() });
    return;
  }

  let signInResponse: Response | null = null;
  try {
    debugContext.trace?.step('signin_nav_start', {
      targetUrl: MWIAH_SIGN_IN_URL,
    });
    signInResponse = await gotoMwiahPage(page, MWIAH_SIGN_IN_URL);
    debugContext.trace?.step('signin_nav_done', { currentUrl: page.url() });
  } catch (err) {
    const pageState = await collectLoginPageState(page).catch(() => null);
    logMwiahLoginDebug({
      event: 'signin_nav_failed',
      hypotheses: [
        MWIAH_LOGIN_HYPOTHESES.NAV_RACE,
        MWIAH_LOGIN_HYPOTHESES.WRONG_PAGE,
        MWIAH_LOGIN_HYPOTHESES.CLOUDFLARE_CHALLENGE,
      ],
      context: debugContext,
      data: {
        targetUrl: MWIAH_SIGN_IN_URL,
        error: String(err),
        pageState,
      },
    });
    throw err;
  }

  await sleep(BROWSER_NAVIGATION_DELAY_MS);

  const pageState = await collectLoginPageState(page);
  logMwiahLoginDebug({
    event: 'signin_nav_complete',
    hypotheses: [
      MWIAH_LOGIN_HYPOTHESES.WRONG_PAGE,
      MWIAH_LOGIN_HYPOTHESES.CLOUDFLARE_CHALLENGE,
      MWIAH_LOGIN_HYPOTHESES.COOKIE_BANNER,
      MWIAH_LOGIN_HYPOTHESES.SLOW_HYDRATION,
    ],
    context: debugContext,
    data: {
      targetUrl: MWIAH_SIGN_IN_URL,
      responseStatus: signInResponse?.status() ?? null,
      cfRay: extractCfRayFromResponse(signInResponse),
      pageState,
      inferredHypotheses: inferHypothesesFromPageState(
        pageState,
        isSignInPath(page.url()),
      ),
    },
  });
  debugContext.trace?.step('signin_ensure_done', { currentUrl: page.url() });
}

async function fillCredentialsAndSubmitOnce(
  page: Page,
  username: string,
  password: string,
  debugContext: MwiahLoginDebugContext,
): Promise<void> {
  debugContext.trace?.step('login_fill_start', { url: page.url() });
  await onMwiahPageLoaded(page);
  debugContext.trace?.step('login_cookie_banner_dismissed', {
    url: page.url(),
  });

  const passwordInput = page.locator('input[type="password"]').first();

  logMwiahLoginDebug({
    event: 'password_wait_start',
    hypotheses: [
      MWIAH_LOGIN_HYPOTHESES.SLOW_HYDRATION,
      MWIAH_LOGIN_HYPOTHESES.COOKIE_BANNER,
      MWIAH_LOGIN_HYPOTHESES.CLOUDFLARE_CHALLENGE,
    ],
    context: debugContext,
    data: { url: page.url() },
  });

  try {
    debugContext.trace?.step('login_password_wait_start', { url: page.url() });
    await passwordInput.waitFor({ state: 'visible', timeout: 20_000 });
    debugContext.trace?.step('login_password_wait_done', { url: page.url() });
  } catch (err) {
    const pageState = await collectLoginPageState(page);
    const inferredHypotheses = inferHypothesesFromPageState(
      pageState,
      isSignInPath(page.url()),
    );

    logMwiahLoginDebug({
      event: 'password_wait_failed',
      hypotheses: inferredHypotheses.length
        ? inferredHypotheses
        : [
            MWIAH_LOGIN_HYPOTHESES.SLOW_HYDRATION,
            MWIAH_LOGIN_HYPOTHESES.COOKIE_BANNER,
            MWIAH_LOGIN_HYPOTHESES.CLOUDFLARE_CHALLENGE,
            MWIAH_LOGIN_HYPOTHESES.WRONG_PAGE,
          ],
      context: debugContext,
      data: {
        error: String(err),
        pageState,
        inferredHypotheses,
      },
    });

    throw new Error(
      `MWIAH password field not visible. ${String(err)} diagnostics=${JSON.stringify(pageState)}`,
    );
  }

  const userInput = page
    .locator(
      [
        'input[name="UserName"]',
        'input[type="email"]',
        'input[name*="user" i]',
        'input[name*="login" i]',
        'input[id*="user" i]',
        'input[autocomplete="username"]',
        'input#username',
      ].join(', '),
    )
    .first();
  debugContext.trace?.step('login_username_wait_start', { url: page.url() });
  await userInput.waitFor({ state: 'visible', timeout: 15_000 });
  debugContext.trace?.step('login_credentials_fill_start', { url: page.url() });
  await userInput.fill(username, { timeout: 10_000 });
  await passwordInput.fill(password, { timeout: 10_000 });
  debugContext.trace?.step('login_credentials_fill_done', { url: page.url() });

  const submitSelector = [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Log in")',
    'button:has-text("Login")',
    'button:has-text("Sign in")',
    '[role="button"]:has-text("Log in")',
    '[role="button"]:has-text("Login")',
    '[role="button"]:has-text("Sign in")',
    'button:has-text("Continue")',
  ].join(', ');
  const submit = page.locator(submitSelector).first();
  try {
    debugContext.trace?.step('login_submit_click_start', { url: page.url() });
    await submit.click({ timeout: 10_000 });
    debugContext.trace?.step('login_submit_click_done', { url: page.url() });
  } catch (clickErr) {
    try {
      await passwordInput.press('Enter', { timeout: 5_000 });
    } catch {
      const pageState = await collectLoginPageState(page);
      throw new Error(
        `MWIAH login submit not found/clickable. ${String(clickErr)} diagnostics=${JSON.stringify(pageState)}`,
      );
    }
  }
  debugContext.trace?.step('login_fill_done', { url: page.url() });
}

async function waitForPostLoginNavigation(
  page: Page,
  debugContext: MwiahLoginDebugContext,
): Promise<void> {
  debugContext.trace?.step('login_post_nav_wait_start', { url: page.url() });
  try {
    await page.waitForURL((url) => !isSignInPath(url.toString()), {
      timeout: 60_000,
    });
    debugContext.trace?.step('login_post_nav_wait_done', { url: page.url() });
  } catch (err) {
    const pageState = await collectLoginPageState(page);
    logMwiahLoginDebug({
      event: 'post_login_nav_failed',
      hypotheses: [
        MWIAH_LOGIN_HYPOTHESES.AUTH_PROVIDER,
        MWIAH_LOGIN_HYPOTHESES.CLOUDFLARE_CHALLENGE,
      ],
      context: debugContext,
      data: {
        error: String(err),
        pageState,
        inferredHypotheses: inferHypothesesFromPageState(
          pageState,
          isSignInPath(page.url()),
        ),
      },
    });
    throw err;
  }

  await page
    .waitForLoadState('networkidle', { timeout: 30_000 })
    .catch(() => undefined);
  await page
    .waitForLoadState('domcontentloaded', { timeout: 60_000 })
    .catch(() => undefined);
  await sleep(BROWSER_NAVIGATION_DELAY_MS);
  await onMwiahPageLoaded(page);
  debugContext.trace?.step('login_post_nav_settle_done', { url: page.url() });
}

export async function performMwiahLogin(params: {
  page: Page;
  username: string;
  password: string;
  debugContext?: MwiahLoginDebugContext;
}): Promise<void> {
  const { page, username, password } = params;
  const debugContext = params.debugContext ?? {};
  const loginStartedAt = Date.now();

  debugContext.trace?.step('login_start', { url: page.url() });

  logMwiahLoginDebug({
    event: 'login_start',
    hypotheses: [MWIAH_LOGIN_HYPOTHESES.CONCURRENT_LOGIN],
    context: debugContext,
    data: { url: page.url() },
  });

  await ensureOnSignInPage(page, debugContext);

  await withMwiahRetries(
    'login',
    {
      url: page.url(),
      jobId: debugContext.jobId ?? null,
      categoryUrl: debugContext.categoryUrl ?? null,
    },
    async (attempt) => {
      debugContext.trace?.step('login_attempt_start', {
        attempt,
        url: page.url(),
      });
      await fillCredentialsAndSubmitOnce(
        page,
        username,
        password,
        debugContext,
      );
      await waitForPostLoginNavigation(page, debugContext);
      debugContext.trace?.step('login_attempt_done', {
        attempt,
        url: page.url(),
      });
    },
  );

  debugContext.trace?.step('login_done', {
    url: page.url(),
    durationMs: Date.now() - loginStartedAt,
  });

  logMwiahLoginDebug({
    event: 'login_complete',
    hypotheses: [MWIAH_LOGIN_HYPOTHESES.CONCURRENT_LOGIN],
    context: debugContext,
    data: {
      url: page.url(),
      durationMs: Date.now() - loginStartedAt,
    },
  });
}
