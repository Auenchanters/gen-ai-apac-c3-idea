import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createMemoryStore } from '../../../../tests/helpers/memory-store.js';
import { JournalRepository } from './journal-repository.js';

describe('UID-scoped journal storage', () => {
  it('isolates listing, loading, deletion, export, and account erasure', async () => {
    const repository = new JournalRepository(createMemoryStore());
    const own = await repository.createJournal('alice', { title: 'Private', tone: 'gentle' });
    expect((await repository.listJournals('bob', {})).journals).toEqual([]);
    await expect(repository.loadJournal('bob', own.id)).rejects.toMatchObject({ status: 404 });
    await expect(repository.deleteJournal('bob', own.id)).rejects.toMatchObject({ status: 404 });
    expect((await repository.exportData('bob')).journals).toEqual([]);
    await repository.deleteAllUserData('bob');
    expect((await repository.loadJournal('alice', own.id)).journal.title).toBe('Private');
    await repository.deleteAllUserData('alice');
    await expect(repository.loadJournal('alice', own.id)).rejects.toMatchObject({ status: 404 });
  });

  it('rejects path injection, unknown input fields, and invalid IDs', async () => {
    const repository = new JournalRepository(createMemoryStore());
    await expect(
      repository.createJournal('../bob', { title: 'No', tone: 'gentle' })
    ).rejects.toThrow();
    await expect(repository.loadJournal('alice', '../bob')).rejects.toThrow();
    await expect(
      repository.createJournal('alice', { title: 'No', tone: 'gentle', uid: 'bob' })
    ).rejects.toThrow();
    await expect(repository.loadJournal('alice', randomUUID())).rejects.toMatchObject({
      status: 404
    });
  });

  it('enforces journal cap and returns an explicit complete export', async () => {
    const repository = new JournalRepository(createMemoryStore());
    for (let i = 0; i < 50; i++)
      await repository.createJournal('alice', { title: `Journal ${String(i)}`, tone: 'gentle' });
    await expect(
      repository.createJournal('alice', { title: 'Over limit', tone: 'gentle' })
    ).rejects.toMatchObject({ code: 'CAPACITY_REACHED' });
    const first = await repository.listJournals('alice', { limit: 20 });
    expect(first.journals).toHaveLength(20);
    expect(first.nextCursor).not.toBeNull();
    expect((await repository.exportData('alice')).journals).toHaveLength(50);
  });
});
