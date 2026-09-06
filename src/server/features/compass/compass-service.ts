import { z } from 'zod';
import type { JournalRepository } from '../journals/journal-repository.js';
import type { MemoryItem } from '../journals/contracts.js';

/** Supported bounded retrospective windows. */
export const compassRequestSchema = z.strictObject({ period: z.enum(['week', 'month']) });
/** Deterministic retrospective derived only from owned summaries and approved memory. */
export interface ReflectionCompass {
  readonly period: 'week' | 'month';
  readonly journalCount: number;
  readonly topics: { topic: string; count: number }[];
  readonly memories: MemoryItem[];
  readonly generatedAt: string;
}

/** Counts distinct journal themes for the selected period, with consented memory only.
 * @param repository - Owned, completeness-checked persistence.
 * @param uid - Verified identity.
 * @param input - Strict week or month selection.
 * @returns Bounded private retrospective.
 */
export async function buildCompass(
  repository: JournalRepository,
  uid: string,
  input: unknown
): Promise<ReflectionCompass> {
  const { period } = compassRequestSchema.parse(input);
  const earliest = Date.now() - (period === 'week' ? 7 : 30) * 86400000;
  const { journals } = await repository.exportData(uid);
  const selected = journals.filter(
    (entry) => entry.journal.updatedAt >= earliest && entry.journal.messageCount > 0
  );
  const counts = new Map<string, number>();
  for (const entry of selected) {
    const topics = new Set(entry.journal.themes.map((theme) => theme.toLowerCase()));
    for (const topic of topics) counts.set(topic, (counts.get(topic) ?? 0) + 1);
  }
  return {
    period,
    journalCount: selected.length,
    topics: [...counts]
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => (a.count === b.count ? a.topic.localeCompare(b.topic) : b.count - a.count)),
    memories: selected.flatMap((entry) =>
      entry.memories.filter((memory) => memory.status === 'approved')
    ),
    generatedAt: new Date().toISOString()
  };
}
