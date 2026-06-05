import { Logger } from '@nestjs/common';
import type { Page, Response } from 'playwright';

import type { MwiahCategoryScrapeTracer } from './mwiah-category-scrape-trace';

const logger = new Logger('MwiahLoginDebug');

const BODY_TEXT_PREVIEW_MAX = 600;
const LOG_PREFIX = 'MWIAH_LOGIN_DEBUG';

export const MWIAH_LOGIN_HYPOTHESES = {
  CLOUDFLARE_CHALLENGE: 'H1-cloudflare-challenge',
  COOKIE_BANNER: 'H2-cookie-banner',
  SLOW_HYDRATION: 'H3-slow-react-hydration',
  WRONG_PAGE: 'H4-wrong-page',
  NAV_RACE: 'H5-navigation-race',
  AUTH_PROVIDER: 'H6-auth-provider-error',
  CONCURRENT_LOGIN: 'H7-concurrent-login',
} as const;

export type MwiahLoginHypothesis =
  (typeof MWIAH_LOGIN_HYPOTHESES)[keyof typeof MWIAH_LOGIN_HYPOTHESES];

export type MwiahLoginDebugContext = {
  jobId?: string | null;
  categoryUrl?: string;
  trace?: MwiahCategoryScrapeTracer;
};

export type MwiahLoginPageState = {
  href: string;
  title: string;
  hasPasswordInput: boolean;
  hasUserInput: boolean;
  passwordInputCount: number;
  passwordInputVisible: boolean;
  userInputVisible: boolean;
  cookieBannerVisible: boolean;
  cloudflareIndicators: boolean;
  authErrorText: string | null;
  bodyTextPreview: string;
  submitCandidates: string[];
};

export function detectCloudflareIndicators(
  title: string,
  bodyText: string,
): boolean {
  const combined = `${title}\n${bodyText}`;
  return (
    /just a moment|checking your browser|cf-browser-verification|enable javascript and cookies/i.test(
      combined,
    ) || /cloudflare/i.test(title)
  );
}

export function detectAuthErrorText(bodyText: string): string | null {
  const patterns = [
    /invalid (?:user|login|credentials)/i,
    /account (?:locked|disabled|suspended)/i,
    /too many (?:attempts|requests)/i,
    /session (?:expired|invalid)/i,
    /sign.?in (?:failed|error)/i,
  ];
  for (const pattern of patterns) {
    const match = bodyText.match(pattern);
    if (match) {
      return match[0];
    }
  }
  return null;
}

export function logMwiahLoginDebug(params: {
  event: string;
  hypotheses: MwiahLoginHypothesis[];
  context: MwiahLoginDebugContext;
  data?: Record<string, unknown>;
}): void {
  logger.log(
    `${LOG_PREFIX} ${JSON.stringify({
      event: params.event,
      hypotheses: params.hypotheses,
      jobId: params.context.jobId ?? null,
      categoryUrl: params.context.categoryUrl ?? null,
      ts: new Date().toISOString(),
      pid: process.pid,
      ...params.data,
    })}`,
  );
}

export function extractCfRayFromResponse(
  response: Response | null,
): string | null {
  if (!response) {
    return null;
  }
  return response.headers()['cf-ray'] ?? null;
}

export async function collectLoginPageState(
  page: Page,
): Promise<MwiahLoginPageState> {
  const passwordLocator = page.locator('input[type="password"]').first();
  const userLocator = page
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
  const cookieBannerLocator = page
    .locator('#onetrust-banner-sdk')
    .or(page.locator('#onetrust-accept-btn-handler'))
    .first();

  const passwordInputCount = await page
    .locator('input[type="password"]')
    .count();
  const passwordInputVisible = await passwordLocator
    .isVisible()
    .catch(() => false);
  const userInputVisible = await userLocator.isVisible().catch(() => false);
  const cookieBannerVisible = await cookieBannerLocator
    .isVisible()
    .catch(() => false);

  const domState = await page.evaluate((bodyTextPreviewMax) => {
    const bodyText = (document.body?.innerText ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, bodyTextPreviewMax);

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

    const hasChallengeDom =
      !!document.querySelector(
        '#challenge-running, #cf-wrapper, .cf-error-code, iframe[src*="challenges.cloudflare"], .cf-turnstile, [data-cf-beacon]',
      ) ||
      /just a moment|checking your browser|cf-browser-verification/i.test(
        `${document.title}\n${bodyText}`,
      );

    return {
      href: location.href,
      title: document.title,
      hasPasswordInput: !!document.querySelector('input[type="password"]'),
      hasUserInput: !!document.querySelector(
        'input[type="email"], input[name*="user" i], input[name="UserName"], input[name*="login" i], input[autocomplete="username"], input#username',
      ),
      bodyTextPreview: bodyText,
      submitCandidates,
      cloudflareIndicators: hasChallengeDom,
    };
  }, BODY_TEXT_PREVIEW_MAX);

  const authErrorText = detectAuthErrorText(domState.bodyTextPreview);

  return {
    ...domState,
    passwordInputCount,
    passwordInputVisible,
    userInputVisible,
    cookieBannerVisible,
    authErrorText,
    cloudflareIndicators:
      domState.cloudflareIndicators ||
      detectCloudflareIndicators(domState.title, domState.bodyTextPreview),
  };
}

export function inferHypothesesFromPageState(
  pageState: MwiahLoginPageState,
  onSignInPath: boolean,
): MwiahLoginHypothesis[] {
  const hypotheses: MwiahLoginHypothesis[] = [];

  if (pageState.cloudflareIndicators) {
    hypotheses.push(MWIAH_LOGIN_HYPOTHESES.CLOUDFLARE_CHALLENGE);
  }
  if (pageState.cookieBannerVisible) {
    hypotheses.push(MWIAH_LOGIN_HYPOTHESES.COOKIE_BANNER);
  }
  if (
    pageState.hasPasswordInput &&
    !pageState.passwordInputVisible &&
    !pageState.cloudflareIndicators
  ) {
    hypotheses.push(MWIAH_LOGIN_HYPOTHESES.SLOW_HYDRATION);
  }
  if (!onSignInPath) {
    hypotheses.push(MWIAH_LOGIN_HYPOTHESES.WRONG_PAGE);
  }
  if (pageState.authErrorText) {
    hypotheses.push(MWIAH_LOGIN_HYPOTHESES.AUTH_PROVIDER);
  }

  return hypotheses;
}
