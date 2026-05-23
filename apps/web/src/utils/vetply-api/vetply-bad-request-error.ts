import type { VetplyFailReason } from '@vetply/shared';

export class VetplyBadRequestError extends Error {
  readonly name = 'VetplyBadRequestError';

  constructor(public readonly failReason: VetplyFailReason) {
    super(failReason);
  }
}

export function isVetplyBadRequestError(
  e: unknown,
): e is VetplyBadRequestError {
  return e instanceof VetplyBadRequestError;
}
