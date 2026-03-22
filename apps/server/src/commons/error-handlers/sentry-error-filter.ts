import { BadRequestException } from '@nestjs/common';
import { CustomException } from '../errors/custom-exception';

export function shouldExcludeFromSentry(error: unknown): boolean {
  if (error instanceof CustomException) {
    return shouldExcludeCustomExceptionFromSentry(error);
  }

  if (error instanceof BadRequestException) {
    return true;
  }

  return false;
}

function shouldExcludeCustomExceptionFromSentry(
  error: CustomException,
): boolean {
  const allCustomExceptions = collectCustomExceptions(error);

  if (
    allCustomExceptions.length > 0 &&
    allCustomExceptions.every((e) => e.excludeFromSentry === true)
  ) {
    return true;
  }

  return false;
}

function collectCustomExceptions(root: CustomException): CustomException[] {
  const collected: CustomException[] = [];
  let current: unknown = root;

  while (current instanceof CustomException) {
    collected.push(current);
    current = current.cause;
  }

  return collected;
}
