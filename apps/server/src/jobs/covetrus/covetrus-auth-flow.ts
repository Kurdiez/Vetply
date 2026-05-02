import type { Page } from 'playwright';

import { BROWSER_NAVIGATION_DELAY_MS } from './covetrus-browser-launch';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
        'input[type="email"], input[name*="user" i], input[name*="login" i], input[autocomplete="username"], input#username',
      ),
      submitCandidates,
    };
  });

  return JSON.stringify(info);
}

export async function performCovetrusLogin(params: {
  page: Page;
  loginUrl: string;
  username: string;
  password: string;
}): Promise<void> {
  const { page, loginUrl, username, password } = params;

  await page.goto(loginUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await sleep(BROWSER_NAVIGATION_DELAY_MS);

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ state: 'visible', timeout: 20_000 });

  const userInput = page
    .locator(
      'input[type="email"], input[name*="user" i], input[name*="login" i], input[autocomplete="username"], input#username',
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
        `Covetrus login submit not found/clickable. ${String(clickErr)} diagnostics=${details}`,
      );
    }
  }

  await page
    .waitForLoadState('domcontentloaded', { timeout: 60_000 })
    .catch(() => undefined);
  await sleep(BROWSER_NAVIGATION_DELAY_MS);
}
