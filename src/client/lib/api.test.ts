import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ApiClient } from './api.js';

describe('same-origin API client', () => {
  it('uses a fresh bearer token and validates the response', async () => {
    let calls = 0;
    const network = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    const client = new ApiClient(() => {
      calls++;
      return Promise.resolve('test-bearer');
    }, network);
    expect(await client.get('/api/journals', z.object({ ok: z.boolean() }))).toEqual({ ok: true });
    expect(calls).toBe(1);
    expect(network).toHaveBeenCalledWith(
      '/api/journals',
      expect.objectContaining({
        cache: 'no-store',
        credentials: 'omit',
        headers: expect.objectContaining({ Authorization: 'Bearer test-bearer' })
      })
    );
  });
  it('never sends a token to external or traversal URLs', async () => {
    const network = vi.fn<typeof fetch>();
    const client = new ApiClient(() => Promise.resolve('token'), network);
    for (const path of [
      'https://evil.test/api',
      '//evil.test/api',
      '/api/../outside',
      '/api/%2e%2e/outside'
    ])
      await expect(client.get(path, z.unknown())).rejects.toThrow();
    expect(network).not.toHaveBeenCalled();
  });
  it('hides raw network and backend errors', async () => {
    const client = new ApiClient(
      () => Promise.resolve('token'),
      () => Promise.resolve(new Response('private stack trace', { status: 500 }))
    );
    await expect(client.get('/api/journals', z.unknown())).rejects.toThrow(
      'The request could not be completed.'
    );
  });
});
