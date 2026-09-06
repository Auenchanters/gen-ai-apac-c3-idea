import { describe, expect, it, vi } from 'vitest';

import { authenticateRequest } from './authentication.js';

describe('verified identity', () => {
  it.each([undefined, '', 'Basic abc', 'Bearer ', 'Bearer abc def', 'Bearer abc,def'])(
    'rejects malformed bearer headers',
    async (header) => {
      const verify = vi.fn();
      await expect(authenticateRequest(header, verify)).rejects.toMatchObject({
        status: 401,
        code: 'UNAUTHENTICATED'
      });
      expect(verify).not.toHaveBeenCalled();
    }
  );
  it('uses only the verified UID', async () => {
    expect(
      await authenticateRequest('Bearer opaque-test-token', () =>
        Promise.resolve({ uid: 'alice', admin: true })
      )
    ).toEqual({ uid: 'alice' });
  });
  it.each(['', '../bob', 'a/b', '.', 'a'.repeat(129)])('rejects unsafe UID %s', async (uid) => {
    await expect(
      authenticateRequest('Bearer token', () => Promise.resolve({ uid }))
    ).rejects.toMatchObject({ status: 401 });
  });
  it('hides expired, revoked and upstream errors', async () => {
    await expect(
      authenticateRequest('Bearer token', () =>
        Promise.reject(new Error('sensitive upstream detail'))
      )
    ).rejects.toMatchObject({ status: 401, message: 'Sign in to continue.' });
  });
});
