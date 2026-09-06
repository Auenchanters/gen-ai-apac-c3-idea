import { randomUUID } from 'node:crypto';
import type { JournalTurnResult } from '../generation/output-schema.js';
import { LIMITS, type CommittedTurn, type JournalState } from './contracts.js';
import { capacity, conflict, requireJournal } from './repository-guards.js';
import { completedTurn, type TurnReservation } from './turn-reservation.js';

/** Atomically commits a validated reflection only while its original lease and revision remain valid.
 * @param state - Owned transaction snapshot.
 * @param reservation - Original generation ownership.
 * @param output - Validated model output.
 * @returns Fully persisted message pair and metadata.
 */
export function commitTurn(
  state: JournalState,
  reservation: TurnReservation,
  output: JournalTurnResult
): CommittedTurn {
  const journal = requireJournal(state);
  if (
    journal.lease?.token !== reservation.token ||
    journal.version !== reservation.version ||
    journal.lease.expiresAt <= Date.now()
  )
    throw conflict();
  const record = state.turns.find((turn) => turn.id === reservation.record.id);
  if (record?.status !== 'pending') throw conflict();
  if (state.memories.length + output.proposals.length > LIMITS.memories) throw capacity();
  const now = Date.now();
  state.messages.push(
    {
      id: record.userMessageId,
      role: 'user',
      text: reservation.input.userMessage.text,
      sequence: journal.messageCount,
      requestId: record.id,
      createdAt: now
    },
    {
      id: record.modelMessageId,
      role: 'model',
      text: output.reply,
      sequence: journal.messageCount + 1,
      requestId: record.id,
      createdAt: now
    }
  );
  for (const proposal of output.proposals)
    state.memories.push({
      ...proposal,
      id: randomUUID(),
      status: 'proposed',
      revision: 0,
      createdAt: now,
      updatedAt: now
    });
  Object.assign(journal, {
    summary: output.summary,
    themes: output.themes,
    nextStep: output.nextStep,
    messageCount: journal.messageCount + 2,
    version: journal.version + 1,
    updatedAt: now,
    lease: null
  });
  record.status = 'complete';
  record.version = journal.version;
  return completedTurn(state, record);
}
