import { describe, expect, it } from 'vitest';

import { loadEnvironment } from './environment.js';

const valid = {
  NODE_ENV: 'test',
  PORT: '8080',
  APP_ORIGIN: 'http://localhost:8080',
  FIREBASE_PROJECT_ID: 'daymark-test',
  FIREBASE_WEB_API_KEY: 'public-firebase-identifier',
  FIREBASE_AUTH_DOMAIN: 'daymark-test.firebaseapp.com',
  FIREBASE_APP_ID: 'public-app-id',
  GEMINI_API_KEY: 'private-test-sentinel'
};

describe('environment trust boundary', () => {
  it('exposes only Firebase browser configuration', () => {
    const env = loadEnvironment(valid);
    expect(env.publicConfig).toEqual({
      apiKey: 'public-firebase-identifier',
      authDomain: 'daymark-test.firebaseapp.com',
      projectId: 'daymark-test',
      appId: 'public-app-id'
    });
    expect(JSON.stringify(env.publicConfig)).not.toContain('private-test-sentinel');
    expect(Object.isFrozen(env.publicConfig)).toBe(true);
  });
  it.each([
    'GEMINI_API_KEY',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_WEB_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_APP_ID',
    'APP_ORIGIN'
  ])('rejects missing %s', (key) => {
    expect(() => loadEnvironment({ ...valid, [key]: '' })).toThrow();
  });
  it.each([
    'https://example.com/path',
    'https://u:p@example.com',
    'https://example.com?query',
    'https://example.com/#hash',
    'https://example.com/'
  ])('rejects non-canonical origin %s', (origin) => {
    expect(() => loadEnvironment({ ...valid, APP_ORIGIN: origin })).toThrow();
  });
  it('requires HTTPS in production and hides invalid values', () => {
    expect(() => loadEnvironment({ ...valid, NODE_ENV: 'production' })).toThrow();
    expect(() => loadEnvironment({ ...valid, PORT: 'secret-sentinel' })).toThrow(
      'Invalid server configuration: PORT'
    );
    expect(() => loadEnvironment({ ...valid, FIREBASE_AUTH_DOMAIN: 'evil.test/path' })).toThrow();
    expect(() =>
      loadEnvironment({ ...valid, FIREBASE_AUTH_DOMAIN: 'other-project.firebaseapp.com' })
    ).toThrow();
  });
});
