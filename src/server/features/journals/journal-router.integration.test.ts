import pino from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createMemoryStore } from '../../../../tests/helpers/memory-store.js';
import { createApplication } from '../../app.js';
import { loadEnvironment } from '../../config/environment.js';
import { JournalRepository } from './journal-repository.js';
import { createJournalRouter } from './journal-router.js';
import { TurnService } from './turn-service.js';

const origin = 'http://localhost:8080';
function fixture(): ReturnType<typeof createApplication> {
  const repository = new JournalRepository(createMemoryStore());
  const turnService = new TurnService(repository, (input) =>
    Promise.resolve({
      reply: 'What would a small first step look like?',
      summary: 'Considering a new direction.',
      themes: ['Growth'],
      nextStep: 'Write down one possibility.',
      proposals: [
        {
          kind: 'question',
          text: 'Explore a new direction.',
          sourceMessageIds: [input.userMessage.id]
        }
      ]
    })
  );
  return createApplication({
    environment: loadEnvironment({
      NODE_ENV: 'test',
      APP_ORIGIN: origin,
      FIREBASE_PROJECT_ID: 'daymark-test',
      FIREBASE_WEB_API_KEY: 'public-test',
      FIREBASE_AUTH_DOMAIN: 'daymark-test.firebaseapp.com',
      FIREBASE_APP_ID: 'test-app',
      GEMINI_API_KEY: 'test-secret'
    }),
    verifyToken: (token) => Promise.resolve({ uid: token }),
    logger: pino({ enabled: false }),
    ready: () => true,
    privateRouter: createJournalRouter({ repository, turnService })
  });
}

describe('owned journal API journey', () => {
  it('saves an idempotent turn, exposes no coordination data, and separates two users', async () => {
    const app = fixture();
    const created = await request(app)
      .post('/api/journals')
      .auth('alice', { type: 'bearer' })
      .set('Origin', origin)
      .send({ title: 'A new direction' });
    expect(created.status).toBe(201);
    const id = String(created.body.id);
    expect(created.body).not.toHaveProperty('lease');
    expect(created.body).not.toHaveProperty('deleted');
    const payload = {
      requestId: 'cc35e7f6-185a-4aa9-bb65-6ee6cba1e4fe',
      text: 'I want to try something new.'
    };
    const turn = await request(app)
      .post(`/api/journals/${id}/turns`)
      .auth('alice', { type: 'bearer' })
      .set('Origin', origin)
      .send(payload);
    expect(turn.status).toBe(200);
    expect(turn.body.messages).toHaveLength(2);
    expect(turn.body.journal.messageCount).toBe(2);
    expect(turn.body.journal).not.toHaveProperty('lease');
    const repeated = await request(app)
      .post(`/api/journals/${id}/turns`)
      .auth('alice', { type: 'bearer' })
      .set('Origin', origin)
      .send(payload);
    expect(repeated.body.messages).toEqual(turn.body.messages);
    expect(
      (await request(app).get(`/api/journals/${id}`).auth('bob', { type: 'bearer' })).status
    ).toBe(404);
    expect(
      (await request(app).get('/api/journals').auth('bob', { type: 'bearer' })).body.journals
    ).toEqual([]);
    const memoryId = String(turn.body.memories[0].id);
    const approved = await request(app)
      .patch(`/api/journals/${id}/memories/${memoryId}`)
      .auth('alice', { type: 'bearer' })
      .set('Origin', origin)
      .send({ revision: 0, action: 'approve' });
    expect(approved.body.status).toBe('approved');
    const compass = await request(app)
      .post('/api/compass')
      .auth('alice', { type: 'bearer' })
      .set('Origin', origin)
      .send({ period: 'week' });
    expect(compass.body.topics).toEqual([{ topic: 'growth', count: 1 }]);
    expect(compass.body.memories).toHaveLength(1);
    const exported = await request(app).get('/api/export').auth('alice', { type: 'bearer' });
    expect(exported.body.journals[0].messages).toHaveLength(2);
    expect(exported.body.journals[0].journal).not.toHaveProperty('lease');
    const deleted = await request(app)
      .delete('/api/account-data')
      .auth('alice', { type: 'bearer' })
      .set('Origin', origin);
    expect(deleted.status).toBe(204);
    expect(
      (await request(app).get('/api/journals').auth('alice', { type: 'bearer' })).body.journals
    ).toEqual([]);
  });

  it('rejects untrusted fields and protects every resource mutation from a foreign user', async () => {
    const app = fixture();
    expect(
      (
        await request(app)
          .post('/api/journals')
          .auth('alice', { type: 'bearer' })
          .set('Origin', origin)
          .send({ title: 'Private', uid: 'bob' })
      ).status
    ).toBe(400);
    const created = await request(app)
      .post('/api/journals')
      .auth('alice', { type: 'bearer' })
      .set('Origin', origin)
      .send({ title: 'Private' });
    const path = `/api/journals/${String(created.body.id)}`;
    expect(
      (await request(app).delete(path).auth('bob', { type: 'bearer' }).set('Origin', origin)).status
    ).toBe(404);
    expect(
      (
        await request(app)
          .post(`${path}/turns`)
          .auth('bob', { type: 'bearer' })
          .set('Origin', origin)
          .send({ requestId: crypto.randomUUID(), text: 'intrusion' })
      ).status
    ).toBe(404);
    expect(
      (
        await request(app)
          .patch(`${path}/memories/${crypto.randomUUID()}`)
          .auth('bob', { type: 'bearer' })
          .set('Origin', origin)
          .send({ revision: 0, action: 'delete' })
      ).status
    ).toBe(404);
    expect(
      (await request(app).get('/api/export').auth('bob', { type: 'bearer' })).body.journals
    ).toEqual([]);
    await request(app)
      .delete('/api/account-data')
      .auth('bob', { type: 'bearer' })
      .set('Origin', origin);
    expect((await request(app).get(path).auth('alice', { type: 'bearer' })).status).toBe(200);
    expect(
      (await request(app).delete(path).auth('alice', { type: 'bearer' }).set('Origin', origin))
        .status
    ).toBe(204);
    expect((await request(app).get(path).auth('alice', { type: 'bearer' })).status).toBe(404);
  });
});
