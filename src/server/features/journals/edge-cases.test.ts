import { createHash, randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Journal, JournalState, TurnRecord } from './contracts.js';
import { LIMITS } from './contracts.js';
import type { JournalStore } from './journal-store.js';
import { JournalRepository } from './journal-repository.js';
import { commitTurn } from './turn-commit.js';
import { reserveTurn, type TurnReservation } from './turn-reservation.js';
import { drainServer, listen } from '../../infrastructure/server-lifecycle.js';
import type { JournalTurnResult } from '../generation/output-schema.js';
import { updateMemory } from '../memory/memory-service.js';
import { createMemoryStore } from '../../../../tests/helpers/memory-store.js';

const uid = 'alice';
const journalId = 'c26b9a1a-45e7-42c7-971e-ddd6410b9277';
const requestId = 'cc35e7f6-185a-4aa9-bb65-6ee6cba1e4fe';
const userMessageId = 'af354fcd-5c20-4b79-93e4-901f42b91550';
const modelMessageId = 'b7a49c6d-7fc0-4d3c-9a4f-2d58b4d6656b';
const memoryId = '32abca91-998f-4673-926d-47c3b67d21a0';

function baseState(): JournalState {
  return {
    user: { deleting: false, journalCount: 1, quotaDay: '', quotaCount: 0 },
    journal: {
      id: journalId,
      title: 'Today',
      tone: 'gentle',
      summary: '',
      themes: [],
      nextStep: '',
      messageCount: 0,
      version: 0,
      createdAt: 0,
      updatedAt: 0,
      deleted: false,
      lease: null
    },
    messages: [],
    memories: [],
    turns: []
  };
}

function fixtureJournal(state: JournalState): Journal {
  if (state.journal === null) throw new Error('Fixture journal missing');
  return state.journal;
}

function pendingRecord(): TurnRecord {
  return {
    id: requestId,
    hash: createHash('sha256').update('A thought').digest('hex'),
    status: 'pending',
    userMessageId,
    modelMessageId,
    version: 0
  };
}

function output(): JournalTurnResult {
  return { reply: 'Reply', summary: 'Summary', themes: ['Work'], nextStep: 'Rest', proposals: [] };
}

function reservation(state: JournalState): TurnReservation {
  const journal = state.journal;
  if (journal === null) throw new Error('Fixture journal missing');
  const record = pendingRecord();
  state.turns.push(record);
  const lease = {
    requestId,
    token: '2f0d9b7e-5e7e-4c5e-9c72-1cc71d6c0a1d',
    expiresAt: Date.now() + 60000
  };
  journal.lease = lease;
  return {
    token: lease.token,
    version: journal.version,
    record,
    input: {
      summary: '',
      tone: 'gentle',
      messages: [],
      memories: [],
      userMessage: { id: userMessageId, text: 'A thought' }
    }
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('journal edge conditions', () => {
  it('recovers an expired reservation and resets a stale daily quota', () => {
    const state = baseState();
    const record = pendingRecord();
    state.turns.push(record);
    fixtureJournal(state).lease = {
      requestId,
      token: '2f0d9b7e-5e7e-4c5e-9c72-1cc71d6c0a1d',
      expiresAt: Date.now() - 1
    };
    state.user.quotaDay = '2000-01-01';
    const result = reserveTurn(state, { requestId, text: 'A thought' });
    expect('reservation' in result).toBe(true);
    expect(state.user.quotaCount).toBe(1);
    expect(state.journal?.lease).not.toBeNull();
  });

  it('rejects message and turn capacity before generation', () => {
    const messages = baseState();
    messages.messages = Array.from({ length: LIMITS.messages - 1 }, (_, sequence) => ({
      id: randomUUID(),
      role: 'user' as const,
      text: 'x',
      sequence,
      requestId: randomUUID(),
      createdAt: 0
    }));
    expect(() => reserveTurn(messages, { requestId, text: 'A thought' })).toThrow(
      'storage limit has been reached'
    );
    const turns = baseState();
    turns.turns = Array.from({ length: LIMITS.turns }, () => pendingRecord());
    expect(() => reserveTurn(turns, { requestId: randomUUID(), text: 'A thought' })).toThrow(
      'storage limit has been reached'
    );
  });

  it('commits a valid turn and rejects expired, completed, and over-capacity commits', () => {
    const state = baseState();
    const owned = reservation(state);
    const committed = commitTurn(state, owned, output());
    expect(committed.modelMessage.text).toBe('Reply');
    expect(state.journal?.lease).toBeNull();
    expect(state.turns[0]?.status).toBe('complete');
    fixtureJournal(state).lease = {
      requestId,
      token: owned.token,
      expiresAt: Date.now() + 60000
    };
    fixtureJournal(state).version = owned.version;
    expect(() => commitTurn(state, owned, output())).toThrow('changed. Reload and retry');

    const expired = baseState();
    const expiredReservation = reservation(expired);
    const expiredJournal = fixtureJournal(expired);
    if (expiredJournal.lease === null) throw new Error('Fixture lease missing');
    expiredJournal.lease.expiresAt = Date.now() - 1;
    expect(() => commitTurn(expired, expiredReservation, output())).toThrow(
      'changed. Reload and retry'
    );

    const full = baseState();
    const fullReservation = reservation(full);
    full.memories = Array.from({ length: LIMITS.memories }, (_, index) => ({
      id: randomUUID(),
      kind: 'fact' as const,
      text: `Memory ${String(index)}`,
      status: 'proposed' as const,
      sourceMessageIds: [userMessageId],
      revision: 0,
      createdAt: 0,
      updatedAt: 0
    }));
    expect(() =>
      commitTurn(full, fullReservation, {
        ...output(),
        proposals: [{ kind: 'fact', text: 'Another', sourceMessageIds: [userMessageId] }]
      })
    ).toThrow('storage limit has been reached');
  });
});

describe('repository and memory edge conditions', () => {
  it('reports invalid memory transitions and export races', async () => {
    const repository = new JournalRepository(createMemoryStore());
    const journal = await repository.createJournal(uid, { title: 'Today' });
    await repository.store.transact(uid, journal.id, (state) => {
      state.messages.push({
        id: userMessageId,
        role: 'user',
        text: 'Source',
        sequence: 0,
        requestId,
        createdAt: 0
      });
      state.memories.push({
        id: memoryId,
        kind: 'fact',
        text: 'Fact',
        status: 'rejected',
        sourceMessageIds: [userMessageId],
        revision: 0,
        createdAt: 0,
        updatedAt: 0
      });
    });
    await expect(
      updateMemory(
        repository,
        uid,
        { journalId: journal.id, memoryId },
        { revision: 0, action: 'approve' }
      )
    ).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
    const rejectedId = randomUUID();
    await repository.store.transact(uid, journal.id, (state) => {
      state.memories.push({
        id: rejectedId,
        kind: 'fact',
        text: 'Another fact',
        status: 'proposed',
        sourceMessageIds: [userMessageId],
        revision: 0,
        createdAt: 0,
        updatedAt: 0
      });
    });
    await expect(
      updateMemory(
        repository,
        uid,
        { journalId: journal.id, memoryId: rejectedId },
        { revision: 0, action: 'reject' }
      )
    ).resolves.toMatchObject({ status: 'rejected' });
    await expect(
      updateMemory(
        repository,
        uid,
        { journalId: journal.id, memoryId: randomUUID() },
        { revision: 0, action: 'approve' }
      )
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    const orphanId = randomUUID();
    await repository.store.transact(uid, journal.id, (state) => {
      state.memories.push({
        id: orphanId,
        kind: 'fact',
        text: 'Orphaned fact',
        status: 'proposed',
        sourceMessageIds: [randomUUID()],
        revision: 0,
        createdAt: 0,
        updatedAt: 0
      });
    });
    await expect(
      updateMemory(
        repository,
        uid,
        { journalId: journal.id, memoryId: orphanId },
        { revision: 0, action: 'approve' }
      )
    ).rejects.toMatchObject({ code: 'CONFLICT' });

    const baseJournal: Journal = { ...journal, messageCount: 2 };
    let listCalls = 0;
    const state = baseState();
    state.journal = baseJournal;
    const store: JournalStore = {
      transact: <T>(_owner: string, _id: string, operation: (current: JournalState) => T) =>
        Promise.resolve(operation(structuredClone(state))),
      list: () => {
        listCalls++;
        return Promise.resolve([listCalls === 1 ? baseJournal : { ...baseJournal, version: 2 }]);
      },
      eraseJournal: () => Promise.resolve(),
      eraseUser: () => Promise.resolve()
    };
    await expect(new JournalRepository(store).exportData(uid)).rejects.toMatchObject({
      code: 'CONFLICT'
    });
  });
});

describe('server lifecycle and repository bounds', () => {
  it('forces the graceful drain deadline before cleanup', async () => {
    vi.useFakeTimers();
    let closeCallback: (() => void) | undefined;
    const closeAllConnections = vi.fn();
    const server = {
      closeAllConnections,
      close: (callback: () => void) => {
        closeCallback = callback;
      }
    } as unknown as Server;
    const pending = drainServer(server, () => Promise.resolve());
    await vi.advanceTimersByTimeAsync(8000);
    expect(closeAllConnections).toHaveBeenCalledTimes(1);
    closeCallback?.();
    await pending;
  });

  it('handles listener and drain failures without hanging', async () => {
    const listener = {
      listen: vi.fn((_port: number, _host: string, callback: (error?: Error) => void) => {
        queueMicrotask(() => {
          callback(new Error('listen failure'));
        });
        return {};
      })
    };
    await expect(listen(listener as never, 0)).rejects.toThrow('listen failure');

    const server = {
      closeAllConnections: vi.fn(),
      close: (callback: (error?: Error) => void) => {
        queueMicrotask(() => {
          callback(new Error('close failure'));
        });
      }
    } as unknown as Server;
    await expect(drainServer(server, () => Promise.resolve())).rejects.toThrow('close failure');
  });

  it('reconstructs completed requests only when both messages exist', () => {
    const state = baseState();
    const record = pendingRecord();
    record.status = 'complete';
    state.turns.push(record);
    expect(() => reserveTurn(state, { requestId, text: 'A thought' })).toThrow(
      'changed. Reload and retry'
    );
  });

  it('supports journal pagination and repeated deletion safely', async () => {
    const repository = new JournalRepository(createMemoryStore());
    await repository.createJournal(uid, { title: 'One' });
    await repository.createJournal(uid, { title: 'Two' });
    const first = await repository.listJournals(uid, { limit: 1 });
    expect(first.nextCursor).not.toBeNull();
    const second = await repository.listJournals(uid, { limit: 1, cursor: first.nextCursor });
    expect(second.journals).toHaveLength(1);

    const deleted = await repository.createJournal(uid, { title: 'Delete me' });
    await repository.store.transact(uid, deleted.id, (state) => {
      fixtureJournal(state).deleted = true;
    });
    await repository.deleteJournal(uid, deleted.id);

    const tooMany: JournalStore = {
      transact: <T>(_uid: string, _id: string, operation: (state: JournalState) => T) =>
        Promise.resolve(operation(baseState())),
      list: () =>
        Promise.resolve(
          Array.from({ length: LIMITS.journals + 1 }, () => ({
            ...fixtureJournal(baseState()),
            id: randomUUID()
          }))
        ),
      eraseJournal: () => Promise.resolve(),
      eraseUser: () => Promise.resolve()
    };
    await expect(
      new JournalRepository(tooMany).listJournals(uid, { limit: 20 })
    ).rejects.toMatchObject({
      code: 'CAPACITY_REACHED'
    });
  });
});
