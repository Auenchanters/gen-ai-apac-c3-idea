import { Writable } from 'node:stream';

import { Router } from 'express';
import pino from 'pino';
import request, { type Test } from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApplication } from './app.js';
import { loadEnvironment } from './config/environment.js';

function fixture(
  limit = 100,
  production = false,
  ready = true
): ReturnType<typeof createApplication> {
  const privateRouter = Router();
  privateRouter.post('/probe', (_req, res) => {
    res.json({ uid: res.locals['uid'] });
  });
  privateRouter.get('/failure', () => {
    throw new Error('private-error-sentinel');
  });
  return createApplication({
    environment: loadEnvironment({
      NODE_ENV: production ? 'production' : 'test',
      PORT: '8080',
      APP_ORIGIN: production ? 'https://daymark.example' : 'http://localhost:8080',
      FIREBASE_PROJECT_ID: 'daymark-test',
      FIREBASE_WEB_API_KEY: 'public-key',
      FIREBASE_AUTH_DOMAIN: 'daymark-test.firebaseapp.com',
      FIREBASE_APP_ID: 'app-id',
      GEMINI_API_KEY: 'secret-sentinel'
    }),
    verifyToken: (token) =>
      token === 'alice' ? Promise.resolve({ uid: 'alice' }) : Promise.reject(new Error('revoked')),
    privateRouter,
    logger: pino({ enabled: false }),
    ready: () => ready,
    staticDirectory: 'tests/fixtures/static',
    uidLimit: limit
  });
}

describe('same-origin API boundary', () => {
  it('serves readiness and a usable security contact without authentication', async () => {
    expect((await request(fixture()).get('/readyz')).body).toEqual({ status: 'ready' });
    const unready = await request(fixture(100, false, false)).get('/readyz');
    expect(unready.status).toBe(503);
    expect(unready.body).toEqual({ status: 'not_ready' });
    const contact = await request(fixture()).get('/.well-known/security.txt');
    expect(contact.type).toBe('text/plain');
    expect(contact.text).toContain(
      'Contact: https://github.com/Auenchanters/gen-ai-apac-c3-idea/security/advisories/new'
    );
  });
  it('serves browser routes while missing assets and API paths stay real 404s', async () => {
    const app = fixture();
    expect((await request(app).get('/today').accept('html')).text).toContain('Daymark test shell');
    expect((await request(app).get('/today').accept('json')).status).toBe(404);
    expect((await request(app).get('/missing.js').accept('html')).status).toBe(404);
    expect((await request(app).get('/assets/missing').accept('html')).status).toBe(404);
    expect((await request(app).get('/.git/config').accept('html')).status).toBe(404);
    expect((await request(app).get('/%2egit/config').accept('html')).status).toBe(404);
    expect((await request(app).get('/apiary').accept('html')).status).toBe(200);
    expect((await request(app).post('/today')).status).toBe(404);
  });
  it('enables transport protections only for HTTPS production', async () => {
    const response = await request(fixture(100, true)).get('/healthz');
    expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
    expect(response.headers['content-security-policy']).toContain('upgrade-insecure-requests');
    expect(
      (await request(fixture()).get('/healthz')).headers['strict-transport-security']
    ).toBeUndefined();
  });
  it('rejects compressed bodies and oversized JSON node counts', async () => {
    const app = fixture();
    const compressed = await request(app)
      .post('/api/probe')
      .set('Origin', 'http://localhost:8080')
      .set('Content-Type', 'application/json')
      .set('Content-Encoding', 'gzip')
      .send('invalid');
    expect(compressed.status).toBe(415);
    const nodes = await request(app)
      .post('/api/probe')
      .set('Origin', 'http://localhost:8080')
      .send({ items: Array.from({ length: 1001 }, () => 0) });
    expect(nodes.status).toBe(400);
  });
  it('serves minimal public health and configuration', async () => {
    const app = fixture();
    expect((await request(app).get('/healthz')).body).toEqual({ status: 'ok' });
    const config = await request(app).get('/api/config');
    expect(config.status).toBe(200);
    expect(config.text).not.toContain('secret-sentinel');
    expect(config.headers['cache-control']).toBe('no-store');
  });
  it('requires identity before exposing private data', async () => {
    const response = await request(fixture())
      .post('/api/probe')
      .set('Origin', 'http://localhost:8080')
      .send({});
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });
  it('ignores client-asserted identity at the authentication boundary', async () => {
    const response = await request(fixture())
      .post('/api/probe')
      .set('Origin', 'http://localhost:8080')
      .auth('alice', { type: 'bearer' })
      .send({ uid: 'bob' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ uid: 'alice' });
  });
  it.each([
    'https://evil.example',
    'null',
    'http://localhost:8080/',
    'http://localhost:8080.evil.test'
  ])('rejects origin %s before parsing', async (origin) => {
    expect(
      (
        await request(fixture())
          .post('/api/probe')
          .set('Origin', origin)
          .set('Content-Type', 'application/json')
          .send('{')
      ).status
    ).toBe(403);
  });
  it('rejects absent origin and non-JSON mutations', async () => {
    expect((await request(fixture()).post('/api/probe').send({})).status).toBe(403);
    expect(
      (
        await request(fixture())
          .post('/api/probe')
          .set('Origin', 'http://localhost:8080')
          .send('text')
      ).status
    ).toBe(415);
  });
  it('rejects malformed, oversized and deeply nested JSON', async () => {
    const app = fixture();
    const send = (body: string): Test =>
      request(app)
        .post('/api/probe')
        .set('Origin', 'http://localhost:8080')
        .set('Content-Type', 'application/json')
        .send(body);
    expect((await send('{')).status).toBe(400);
    expect((await send(JSON.stringify({ text: 'x'.repeat(33_000) }))).status).toBe(413);
    expect((await send('{"x":'.repeat(10) + '{}' + '}'.repeat(10))).status).toBe(400);
  });
});

describe('API privacy and operational controls', () => {
  it('hides dependency errors and returns JSON for unknown API routes', async () => {
    const app = fixture();
    const failed = await request(app).get('/api/failure').auth('alice', { type: 'bearer' });
    expect(failed.status).toBe(500);
    expect(failed.text).not.toContain('private-error-sentinel');
    expect(
      (await request(app).get('/api/missing').auth('alice', { type: 'bearer' })).body.error.code
    ).toBe('NOT_FOUND');
  });
  it('sets strict headers compatible with Google popup auth', async () => {
    const response = await request(fixture()).get('/healthz');
    expect(response.headers['content-security-policy']).toContain("object-src 'none'");
    expect(response.headers['content-security-policy']).not.toMatch(/unsafe-inline|unsafe-eval/);
    expect(response.headers['cross-origin-opener-policy']).toBe('same-origin-allow-popups');
    expect(response.headers['permissions-policy']).toContain('camera=()');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
  it('throttles requests by verified user', async () => {
    const app = fixture(1);
    expect((await request(app).get('/api/missing').auth('alice', { type: 'bearer' })).status).toBe(
      404
    );
    const limited = await request(app).get('/api/missing').auth('alice', { type: 'bearer' });
    expect(limited.status).toBe(429);
    expect(limited.headers['retry-after']).toBeDefined();
  });
  it('records only allowlisted request metadata', async () => {
    let logs = '';
    const stream = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        logs += chunk.toString();
        callback();
      }
    });
    const app = createApplication({
      environment: loadEnvironment({
        NODE_ENV: 'test',
        APP_ORIGIN: 'http://localhost:8080',
        FIREBASE_PROJECT_ID: 'daymark-test',
        FIREBASE_WEB_API_KEY: 'public-key',
        FIREBASE_AUTH_DOMAIN: 'daymark-test.firebaseapp.com',
        FIREBASE_APP_ID: 'app-id',
        GEMINI_API_KEY: 'secret'
      }),
      verifyToken: () => Promise.reject(new Error('auth-sensitive')),
      logger: pino({}, stream),
      ready: () => true
    });
    await request(app)
      .get('/api/anything?private=sentinel-query')
      .set('Authorization', 'Bearer sentinel-token');
    expect(logs).toContain('request_complete');
    expect(logs).not.toMatch(/sentinel|auth-sensitive|Authorization/);
  });
});
