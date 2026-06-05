import { detectCloudflareIndicators } from '../mwiah-login-debug';

describe('detectCloudflareIndicators for category list pages', () => {
  it('flags Cloudflare challenge copy', () => {
    expect(
      detectCloudflareIndicators(
        'Just a moment...',
        'Checking your browser before accessing the site',
      ),
    ).toBe(true);
  });

  it('does not flag normal category list copy', () => {
    expect(
      detectCloudflareIndicators(
        'Bone cutters And rongeurs',
        'Showing 24 of 120 products',
      ),
    ).toBe(false);
  });
});
