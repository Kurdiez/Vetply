import { z } from 'zod';

const uuidSchema = z.string().uuid();

export type TestUserImpersonationResult =
  | { kind: 'not_attempted' }
  | { kind: 'authenticated'; userId: string }
  | { kind: 'rejected'; reason: string };

export function resolveTestUserImpersonation(params: {
  expectedSecret: string;
  systemSecretHeader: string | undefined;
  testUserIdHeader: string | undefined;
}): TestUserImpersonationResult {
  const hasSecret =
    params.systemSecretHeader !== undefined &&
    params.systemSecretHeader.length > 0;
  const hasUserId =
    params.testUserIdHeader !== undefined && params.testUserIdHeader.length > 0;

  if (!hasSecret && !hasUserId) {
    return { kind: 'not_attempted' };
  }

  if (!hasSecret || !hasUserId) {
    return {
      kind: 'rejected',
      reason: 'Both x-system-secret and x-test-user-id are required',
    };
  }

  if (params.systemSecretHeader !== params.expectedSecret) {
    return { kind: 'rejected', reason: 'Invalid system secret' };
  }

  const parsedUserId = uuidSchema.safeParse(params.testUserIdHeader);
  if (!parsedUserId.success) {
    return { kind: 'rejected', reason: 'Invalid x-test-user-id' };
  }

  return { kind: 'authenticated', userId: parsedUserId.data };
}

export function readSingleHeader(
  value: string | string[] | undefined,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return Array.isArray(value) ? value[0] : value;
}
