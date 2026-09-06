import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { createMemoryStore } from '../../../../tests/helpers/memory-store.js';
import type { GenerationInput } from '../generation/prompt-builder.js';
import type { JournalTurnResult } from '../generation/output-schema.js';
import { JournalRepository } from './journal-repository.js';
import { TurnService } from './turn-service.js';

function result(input: GenerationInput): JournalTurnResult {
  return {
    reply: 'A reflection',
    summary: 'A summary',
    themes: ['Work'],
    nextStep: 'Rest',
    proposals: [
      { kind: 'preference', text: 'Enjoys quiet', sourceMessageIds: [input.userMessage.id] }
    ]
  };
}

describe('transactional journal turns', () => {
  it('atomically saves paired messages and returns completed duplicate without generating again', async () => {
    const repository = new JournalRepository(createMemoryStore());
    const journal = await repository.createJournal('alice', { title: 'Today' });
    const gateway = vi.fn((input: GenerationInput) => Promise.resolve(result(input)));
    const service = new TurnService(repository, gateway);
    const request = { requestId: randomUUID(), text: 'I enjoy quiet.' };
    const first = await service.submitTurn('alice', journal.id, request);
    const duplicate = await service.submitTurn('alice', journal.id, request);
    expect(duplicate.userMessage.id).toBe(first.userMessage.id);
    expect(gateway).toHaveBeenCalledTimes(1);
    expect(
      (await repository.loadJournal('alice', journal.id)).messages.map((message) => message.role)
    ).toEqual(['user', 'model']);
    await expect(
      service.submitTurn('alice', journal.id, { ...request, text: 'Different' })
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_MISMATCH' });
    await expect(service.submitTurn('bob', journal.id, request)).rejects.toMatchObject({
      status: 404
    });
  });

  it('rejects concurrent requests and prevents half-saves on generation failure', async () => {
    const repository = new JournalRepository(createMemoryStore());
    const journal = await repository.createJournal('alice', { title: 'Today' });
    let rejectGeneration: (error: Error) => void = () => undefined;
    const gateway = (): Promise<JournalTurnResult> =>
      new Promise((_resolve, reject) => {
        rejectGeneration = reject;
      });
    const service = new TurnService(repository, gateway);
    const pending = service.submitTurn('alice', journal.id, {
      requestId: randomUUID(),
      text: 'Hello'
    });
    const rejection = expect(pending).rejects.toThrow('Offline');
    await vi.waitFor(async () => {
      expect((await repository.loadJournal('alice', journal.id)).journal.lease).not.toBeNull();
    });
    await expect(
      service.submitTurn('alice', journal.id, { requestId: randomUUID(), text: 'Other' })
    ).rejects.toMatchObject({ code: 'TURN_IN_PROGRESS' });
    rejectGeneration(new Error('Offline'));
    await rejection;
    expect((await repository.loadJournal('alice', journal.id)).messages).toEqual([]);
    expect((await repository.loadJournal('alice', journal.id)).journal.lease).toBeNull();
  });

  it('never resurrects a journal deleted during generation', async () => {
    const repository = new JournalRepository(createMemoryStore());
    const journal = await repository.createJournal('alice', { title: 'Today' });
    const service = new TurnService(repository, async (input) => {
      await repository.deleteJournal('alice', journal.id);
      return result(input);
    });
    await expect(
      service.submitTurn('alice', journal.id, { requestId: randomUUID(), text: 'Hello' })
    ).rejects.toMatchObject({ status: 404 });
    expect((await repository.exportData('alice')).journals).toEqual([]);
  });

  it('bounds distributed daily generation across separate service instances', async () => {
    const store = createMemoryStore();
    const repository = new JournalRepository(store);
    const journal = await repository.createJournal('alice', { title: 'Today' });
    await store.transact('alice', journal.id, (state) => {
      state.user.quotaDay = new Date().toISOString().slice(0, 10);
      state.user.quotaCount = 100;
    });
    const service = new TurnService(new JournalRepository(store), (input) =>
      Promise.resolve(result(input))
    );
    await expect(
      service.submitTurn('alice', journal.id, { requestId: randomUUID(), text: 'Hello' })
    ).rejects.toMatchObject({ code: 'DAILY_LIMIT' });
  });
});
