import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createMemoryStore } from '../../../../tests/helpers/memory-store.js';
import { JournalRepository } from '../journals/journal-repository.js';
import { TurnService } from '../journals/turn-service.js';
import { updateMemory } from './memory-service.js';
import { buildCompass } from '../compass/compass-service.js';

describe('explicit memory consent and private Compass', () => {
  it('requires approval, enforces revision and provenance, then supports editing, retirement, and deletion', async () => {
    const repository = new JournalRepository(createMemoryStore());
    const journal = await repository.createJournal('alice', { title: 'Today' });
    const service = new TurnService(repository, (input) =>
      Promise.resolve({
        reply: 'Reply',
        summary: 'Summary',
        themes: ['Work'],
        nextStep: 'Rest',
        proposals: [
          { kind: 'fact', text: 'Enjoys quiet', sourceMessageIds: [input.userMessage.id] }
        ]
      })
    );
    const turn = await service.submitTurn('alice', journal.id, {
      requestId: randomUUID(),
      text: 'Hello'
    });
    const memory = turn.memories[0];
    expect(memory).toBeDefined();
    if (memory === undefined) throw new Error('Fixture');
    expect((await buildCompass(repository, 'alice', { period: 'week' })).memories).toEqual([]);
    await expect(
      updateMemory(
        repository,
        'bob',
        { journalId: journal.id, memoryId: memory.id },
        { revision: 0, action: 'approve' }
      )
    ).rejects.toMatchObject({ status: 404 });
    expect(
      await updateMemory(
        repository,
        'alice',
        { journalId: journal.id, memoryId: memory.id },
        { revision: 0, action: 'approve' }
      )
    ).toMatchObject({ status: 'approved', revision: 1 });
    await expect(
      updateMemory(
        repository,
        'alice',
        { journalId: journal.id, memoryId: memory.id },
        { revision: 0, action: 'retire' }
      )
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    expect((await buildCompass(repository, 'alice', { period: 'month' })).memories).toHaveLength(1);
    expect((await buildCompass(repository, 'bob', { period: 'week' })).topics).toEqual([]);
    await updateMemory(
      repository,
      'alice',
      { journalId: journal.id, memoryId: memory.id },
      { revision: 1, action: 'edit', text: '<b>Prefers quiet</b>' }
    );
    expect((await repository.loadJournal('alice', journal.id)).memories[0]?.text).toBe(
      'Prefers quiet'
    );
    await updateMemory(
      repository,
      'alice',
      { journalId: journal.id, memoryId: memory.id },
      { revision: 2, action: 'retire' }
    );
    expect((await buildCompass(repository, 'alice', { period: 'week' })).memories).toEqual([]);
    await updateMemory(
      repository,
      'alice',
      { journalId: journal.id, memoryId: memory.id },
      { revision: 3, action: 'delete' }
    );
    expect((await repository.loadJournal('alice', journal.id)).memories).toEqual([]);
  });
});
