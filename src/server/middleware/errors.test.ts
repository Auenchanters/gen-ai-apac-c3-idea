import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from './errors.js';

describe('safe error middleware', () => {
  it('delegates when the response has already started', () => {
    const next = vi.fn();
    const response = { headersSent: true };
    errorHandler(new Error('private detail'), {} as never, response as never, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
