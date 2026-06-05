import type { Page, Response } from 'playwright';

import { onMwiahPageLoaded } from '../mwiah-cookie-consent';
import { gotoMwiahPage } from '../mwiah-page-navigation';

jest.mock('../mwiah-cookie-consent', () => ({
  onMwiahPageLoaded: jest.fn().mockResolvedValue(undefined),
}));

describe('gotoMwiahPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates then dismisses cookie banner', async () => {
    const response = { ok: () => true, status: () => 200 } as Response;
    const goto = jest.fn().mockResolvedValue(response);
    const page = { goto } as unknown as Page;

    const result = await gotoMwiahPage(
      page,
      'https://onlinestore.mwiah.co.uk/',
    );

    expect(goto).toHaveBeenCalledWith('https://onlinestore.mwiah.co.uk/', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    expect(onMwiahPageLoaded).toHaveBeenCalledWith(page);
    expect(result).toBe(response);
  });

  it('rejects HTTP 5xx when rejectHttp5xx is enabled', async () => {
    const response = { ok: () => false, status: () => 503 } as Response;
    const goto = jest.fn().mockResolvedValue(response);
    const page = { goto } as unknown as Page;

    await expect(
      gotoMwiahPage(page, 'https://onlinestore.mwiah.co.uk/Catalog', {
        rejectHttp5xx: true,
      }),
    ).rejects.toThrow('HTTP 503');
  });
});
