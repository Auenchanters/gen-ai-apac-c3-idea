import { describe, expect, it, vi } from 'vitest';

import type { JournalRepository } from '../journals/journal-repository.js';
import type { JournalDetail } from '../journals/contracts.js';
import { buildCompass } from './compass-service.js';

const memory = {
  id: '32abca91-998f-4673-926d-47c3b67d21a0',
  kind: 'fact' as const,
  text: 'Enjoys quiet walks',
  status: 'approved' as const,
  sourceMessageIds: ['c6992cb7-d22c-4e03-80be-c629b0c8340b'],
  revision: 1,
  createdAt: 1,
  updatedAt: 1
};
const proposedMemory = {
  ...memory,
  id: 'af354fcd-5c20-4b79-93e4-901f42b91550',
  status: 'proposed' as const
};

function detail(input: {
  id: string;
  updatedAt: number;
  messageCount: number;
  themes: string[];
  memories?: JournalDetail['memories'];
}): JournalDetail {
  return {
    journal: {
      id: input.id,
      title: input.id,
      tone: 'gentle',
      summary: '',
      themes: input.themes,
      nextStep: '',
      messageCount: input.messageCount,
      version: 1,
      createdAt: input.updatedAt,
      updatedAt: input.updatedAt,
      deleted: false,
      lease: null
    },
    messages: [],
    memories: input.memories ?? []
  };
}

describe('Reflection Compass aggregation', () => {
  it('counts distinct themes, sorts ties, and includes approved memories by period', async () => {
    const now = Date.now();
    const exportData = vi.fn().mockResolvedValue({
      exportedAt: new Date(now).toISOString(),
      journals: [
        detail({
          id: 'c26b9a1a-45e7-42c7-971e-ddd6410b9277',
          updatedAt: now - 2 * 86400000,
          messageCount: 2,
          themes: ['Common', 'Zeta', 'Common'],
          memories: [memory]
        }),
        detail({
          id: '704d9e67-3bf9-42f9-bf24-e5381c602fef',
          updatedAt: now - 10 * 86400000,
          messageCount: 2,
          themes: ['Common', 'Alpha'],
          memories: [proposedMemory]
        }),
        detail({
          id: 'b7a49c6d-7fc0-4d3c-9a4f-2d58b4d6656b',
          updatedAt: now,
          messageCount: 0,
          themes: ['Ignored']
        })
      ]
    });
    const repository = { exportData } as unknown as JournalRepository;
    const week = await buildCompass(repository, 'alice', { period: 'week' });
    expect(week).toMatchObject({ period: 'week', journalCount: 1 });
    expect(week.topics).toEqual([
      { topic: 'common', count: 1 },
      { topic: 'zeta', count: 1 }
    ]);
    expect(week.memories).toEqual([memory]);
    const month = await buildCompass(repository, 'alice', { period: 'month' });
    expect(month.journalCount).toBe(2);
    expect(month.topics).toEqual([
      { topic: 'common', count: 2 },
      { topic: 'alpha', count: 1 },
      { topic: 'zeta', count: 1 }
    ]);
    expect(month.memories).toHaveLength(1);
  });

  it('rejects unsupported retrospective periods', async () => {
    const exportData = vi.fn();
    const repository = { exportData } as unknown as JournalRepository;
    await expect(buildCompass(repository, 'alice', { period: 'year' })).rejects.toThrow();
    expect(exportData).not.toHaveBeenCalled();
  });
});
