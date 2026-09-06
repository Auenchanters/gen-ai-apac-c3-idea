import type { CommittedTurn, Journal, JournalDetail } from './contracts.js';

/** Browser metadata excludes internal deletion and reservation state. */
export type PublicJournal = Omit<Journal, 'lease' | 'deleted'>;

/** Selects the only journal fields allowed across the browser boundary.
 * @param journal - Persisted internal journal.
 * @returns Public metadata without coordination details.
 */
export function publicJournal(journal: Journal): PublicJournal {
  return {
    id: journal.id,
    title: journal.title,
    tone: journal.tone,
    summary: journal.summary,
    themes: journal.themes,
    nextStep: journal.nextStep,
    messageCount: journal.messageCount,
    version: journal.version,
    createdAt: journal.createdAt,
    updatedAt: journal.updatedAt
  };
}

/** Serializes a complete journal without internal fields.
 * @param detail - Caller-owned data.
 * @returns Browser conversation.
 */
export function publicDetail(
  detail: JournalDetail
): Omit<JournalDetail, 'journal'> & { journal: PublicJournal } {
  return { ...detail, journal: publicJournal(detail.journal) };
}

/** Serializes a committed pair with the same contract used by journal detail.
 * @param turn - Atomically saved turn.
 * @returns Confirmed browser turn.
 */
export function publicTurn(
  turn: CommittedTurn
): ReturnType<typeof publicDetail> & { requestId: string; journalId: string } {
  return {
    requestId: turn.requestId,
    journalId: turn.journalId,
    journal: publicJournal(turn.journal),
    messages: [turn.userMessage, turn.modelMessage],
    memories: turn.memories
  };
}
