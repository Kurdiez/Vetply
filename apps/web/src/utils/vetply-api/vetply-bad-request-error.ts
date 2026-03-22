import type { CreateAccountFailReason } from "@vetply/shared";

export class VetplyBadRequestError extends Error {
  readonly name = "VetplyBadRequestError";

  constructor(public readonly failReason: CreateAccountFailReason) {
    super(failReason);
  }
}

export function isVetplyBadRequestError(
  e: unknown,
): e is VetplyBadRequestError {
  return e instanceof VetplyBadRequestError;
}
