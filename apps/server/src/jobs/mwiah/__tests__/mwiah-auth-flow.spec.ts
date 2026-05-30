import { isSignInPath } from '../mwiah-auth-flow';
import { MWIAH_SIGN_IN_URL } from '../mwiah-urls';

describe('isSignInPath', () => {
  it('returns true for SignIn paths', () => {
    expect(isSignInPath('https://onlinestore.mwiah.co.uk/SignIn')).toBe(true);
    expect(
      isSignInPath('https://onlinestore.mwiah.co.uk/SignIn?returnUrl=%2f'),
    ).toBe(true);
    expect(isSignInPath(`${MWIAH_SIGN_IN_URL}/`)).toBe(true);
  });

  it('returns false for non-sign-in paths', () => {
    expect(isSignInPath('https://onlinestore.mwiah.co.uk/')).toBe(false);
    expect(isSignInPath('https://onlinestore.mwiah.co.uk/Catalog')).toBe(false);
  });

  it('returns false for invalid URLs without signin segment', () => {
    expect(isSignInPath('not-a-url')).toBe(false);
  });

  it('returns true when signin path has query string', () => {
    expect(
      isSignInPath('https://onlinestore.mwiah.co.uk/SignIn?returnUrl=%2f'),
    ).toBe(true);
  });
});
