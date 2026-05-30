import type { Page } from 'playwright';

import { BROWSER_NAVIGATION_DELAY_MS } from '../covetrus/covetrus-browser-launch';
import { dismissMwiahCookieConsentIfPresent } from './mwiah-cookie-consent';
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

async function collectLoginDiagnostics(page: Page): Promise<string> {
  const info = await page.evaluate(() => {
    const submitCandidates = Array.from(
      document.querySelectorAll(
        'button, input[type="submit"], [role="button"], a[role="button"]',
      ),
    )
      .map((el) => {
        const htmlEl = el as HTMLElement;
        const text = (htmlEl.textContent || '').replace(/\s+/g, ' ').trim();
        const value = (el as HTMLInputElement).value || '';
        return text || value || htmlEl.getAttribute('aria-label') || '';
      })
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 20);

    return {
      href: location.href,
      title: document.title,
      hasPasswordInput: !!document.querySelector('input[type="password"]'),
      hasUserInput: !!document.querySelector(
        'input[type="email"], input[name*="user" i], input[name="UserName"], input[name*="login" i], input[autocomplete="username"], input#username',
      ),
      submitCandidates,
    };
  });

  return JSON.stringify(info);
}

async function ensureOnSignInPage(page: Page): Promise<void> {
  if (isSignInPath(page.url())) {
    return;
  }
  await page.goto(MWIAH_SIGN_IN_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await sleep(BROWSER_NAVIGATION_DELAY_MS);
}

async function fillCredentialsAndSubmit(
  page: Page,
  username: string,
  password: string,
): Promise<void> {
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ state: 'visible', timeout: 20_000 });

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
  await userInput.waitFor({ state: 'visible', timeout: 15_000 });
  await userInput.fill(username, { timeout: 10_000 });
  await passwordInput.fill(password, { timeout: 10_000 });

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
    await submit.click({ timeout: 10_000 });
  } catch (clickErr) {
    try {
      await passwordInput.press('Enter', { timeout: 5_000 });
    } catch {
      const details = await collectLoginDiagnostics(page);
      throw new Error(
        `MWIAH login submit not found/clickable. ${String(clickErr)} diagnostics=${details}`,
      );
    }
  }
}

async function waitForPostLoginNavigation(page: Page): Promise<void> {
  await page.waitForURL((url) => !isSignInPath(url.toString()), {
    timeout: 60_000,
  });
  await page
    .waitForLoadState('networkidle', { timeout: 30_000 })
    .catch(() => undefined);
  await page
    .waitForLoadState('domcontentloaded', { timeout: 60_000 })
    .catch(() => undefined);
  await sleep(BROWSER_NAVIGATION_DELAY_MS);
}

export async function performMwiahLogin(params: {
  page: Page;
  username: string;
  password: string;
}): Promise<void> {
  const { page, username, password } = params;

  await ensureOnSignInPage(page);
  await fillCredentialsAndSubmit(page, username, password);
  await waitForPostLoginNavigation(page);
  await dismissMwiahCookieConsentIfPresent(page);
}
