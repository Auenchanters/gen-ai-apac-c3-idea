import express from 'express';
import { describe, expect, it } from 'vitest';

import { listen, drainServer } from './server-lifecycle.js';

describe('server lifecycle', () => {
  it('serves requests and drains before dependency cleanup', async () => {
    const app = express();
    app.get('/healthz', (_req, res) => {
      res.json({ status: 'ok' });
    });
    const server = await listen(app, 0);
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('Missing TCP address');
    expect((await fetch(`http://127.0.0.1:${String(address.port)}/healthz`)).status).toBe(200);
    let cleaned = false;
    await drainServer(server, () => {
      cleaned = true;
      return Promise.resolve();
    });
    expect(cleaned).toBe(true);
    expect(server.listening).toBe(false);
  });
});
