import { CustomException } from '~/commons/errors/custom-exception';

import {
  MWIAH_DEFAULT_MAX_ATTEMPTS,
  withMwiahRetries,
} from '../mwiah-playwright-retries';

describe('withMwiahRetries', () => {
  it('returns on first successful attempt', async () => {
    const fn = jest.fn().mockResolvedValue('ok');

    await expect(
      withMwiahRetries('test action', { key: 'value' }, fn),
    ).resolves.toBe('ok');

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1);
  });

  it('retries and succeeds on a later attempt', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValue('ok');

    await expect(
      withMwiahRetries('test action', { key: 'value' }, fn, 3),
    ).resolves.toBe('ok');

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws CustomException after exhausting attempts', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('persistent failure'));

    await expect(
      withMwiahRetries('test action', { url: 'https://example.com' }, fn, 3),
    ).rejects.toMatchObject({
      message: `MWIAH test action failed after 3 attempts`,
      context: expect.objectContaining({
        action: 'test action',
        attempts: 3,
        url: 'https://example.com',
      }),
    });

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('re-throws CustomException without retrying', async () => {
    const inner = new CustomException('already failed', { code: 'x' });
    const fn = jest.fn().mockRejectedValue(inner);

    await expect(
      withMwiahRetries('test action', {}, fn, MWIAH_DEFAULT_MAX_ATTEMPTS),
    ).rejects.toBe(inner);

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
