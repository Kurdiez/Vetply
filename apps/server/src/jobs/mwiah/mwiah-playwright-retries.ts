import { CustomException } from '~/commons/errors/custom-exception';

export const MWIAH_DEFAULT_MAX_ATTEMPTS = 3;
export const MWIAH_RETRY_BASE_MS = 2_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withMwiahRetries<T>(
  action: string,
  context: Record<string, unknown>,
  fn: (attempt: number) => Promise<T>,
  maxAttempts: number = MWIAH_DEFAULT_MAX_ATTEMPTS,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (error instanceof CustomException) {
        throw error;
      }
      if (attempt < maxAttempts) {
        await sleep(MWIAH_RETRY_BASE_MS * attempt);
      }
    }
  }

  throw new CustomException(
    `MWIAH ${action} failed after ${maxAttempts} attempts`,
    {
      error: lastError,
      action,
      attempts: maxAttempts,
      ...context,
    },
  );
}
