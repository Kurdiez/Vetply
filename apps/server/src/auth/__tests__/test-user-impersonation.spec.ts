import {
  readSingleHeader,
  resolveTestUserImpersonation,
} from '../test-user-impersonation';

const VALID_USER_ID = 'ec556cd6-a21c-406c-b4ce-e9bd3c777030';
const SECRET = 'dev-secret';

describe('resolveTestUserImpersonation', () => {
  it('does not attempt when neither header is present', () => {
    expect(
      resolveTestUserImpersonation({
        expectedSecret: SECRET,
        systemSecretHeader: undefined,
        testUserIdHeader: undefined,
      }),
    ).toEqual({ kind: 'not_attempted' });
  });

  it('authenticates when both headers are valid', () => {
    expect(
      resolveTestUserImpersonation({
        expectedSecret: SECRET,
        systemSecretHeader: SECRET,
        testUserIdHeader: VALID_USER_ID,
      }),
    ).toEqual({ kind: 'authenticated', userId: VALID_USER_ID });
  });

  it('rejects when only one header is present', () => {
    expect(
      resolveTestUserImpersonation({
        expectedSecret: SECRET,
        systemSecretHeader: SECRET,
        testUserIdHeader: undefined,
      }),
    ).toEqual({
      kind: 'rejected',
      reason: 'Both x-system-secret and x-test-user-id are required',
    });
  });

  it('rejects an invalid system secret', () => {
    expect(
      resolveTestUserImpersonation({
        expectedSecret: SECRET,
        systemSecretHeader: 'wrong',
        testUserIdHeader: VALID_USER_ID,
      }),
    ).toEqual({ kind: 'rejected', reason: 'Invalid system secret' });
  });

  it('rejects a non-uuid test user id', () => {
    expect(
      resolveTestUserImpersonation({
        expectedSecret: SECRET,
        systemSecretHeader: SECRET,
        testUserIdHeader: 'not-a-uuid',
      }),
    ).toEqual({ kind: 'rejected', reason: 'Invalid x-test-user-id' });
  });
});

describe('readSingleHeader', () => {
  it('reads the first value from an array header', () => {
    expect(readSingleHeader(['a', 'b'])).toBe('a');
  });

  it('returns undefined when missing', () => {
    expect(readSingleHeader(undefined)).toBeUndefined();
  });
});
