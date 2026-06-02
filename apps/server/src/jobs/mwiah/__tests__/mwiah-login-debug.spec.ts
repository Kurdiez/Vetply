import {
  detectAuthErrorText,
  detectCloudflareIndicators,
  inferHypothesesFromPageState,
  MWIAH_LOGIN_HYPOTHESES,
  type MwiahLoginPageState,
} from '../mwiah-login-debug';

function basePageState(
  overrides: Partial<MwiahLoginPageState> = {},
): MwiahLoginPageState {
  return {
    href: 'https://onlinestore.mwiah.co.uk/SignIn',
    title: 'Sign In',
    hasPasswordInput: true,
    hasUserInput: true,
    passwordInputCount: 1,
    passwordInputVisible: true,
    userInputVisible: true,
    cookieBannerVisible: false,
    cloudflareIndicators: false,
    authErrorText: null,
    bodyTextPreview: 'Sign in to your account',
    submitCandidates: ['Log in'],
    ...overrides,
  };
}

describe('detectCloudflareIndicators', () => {
  it('detects Cloudflare challenge titles', () => {
    expect(
      detectCloudflareIndicators('Just a moment...', 'Checking your browser'),
    ).toBe(true);
  });

  it('returns false for normal sign-in page', () => {
    expect(
      detectCloudflareIndicators('Sign In', 'Username Password Log in'),
    ).toBe(false);
  });
});

describe('detectAuthErrorText', () => {
  it('detects invalid credentials messaging', () => {
    expect(
      detectAuthErrorText('Invalid login attempt. Please try again.'),
    ).toBe('Invalid login');
  });
});

describe('inferHypothesesFromPageState', () => {
  it('infers cookie banner when banner is visible', () => {
    const hypotheses = inferHypothesesFromPageState(
      basePageState({
        cookieBannerVisible: true,
        passwordInputVisible: false,
        hasPasswordInput: true,
      }),
      true,
    );
    expect(hypotheses).toContain(MWIAH_LOGIN_HYPOTHESES.COOKIE_BANNER);
    expect(hypotheses).toContain(MWIAH_LOGIN_HYPOTHESES.SLOW_HYDRATION);
  });

  it('infers wrong page when not on sign-in path', () => {
    const hypotheses = inferHypothesesFromPageState(
      basePageState({ href: 'https://onlinestore.mwiah.co.uk/' }),
      false,
    );
    expect(hypotheses).toContain(MWIAH_LOGIN_HYPOTHESES.WRONG_PAGE);
  });
});
