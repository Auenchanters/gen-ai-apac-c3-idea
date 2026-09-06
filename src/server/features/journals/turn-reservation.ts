import { createHash, randomUUID } from 'node:crypto';
import { AppError } from '../../errors/app-error.js';
import type { GenerationInput } from '../generation/prompt-builder.js';
import {
  LIMITS,
  type CommittedTurn,
  type JournalState,
  type TurnRecord,
  type TurnRequest
} from './contracts.js';
import { capacity, conflict, requireJournal } from './repository-guards.js';

/** Reserved generation ownership and server-owned context. */
export interface TurnReservation {
  readonly token: string;
  readonly version: number;
  readonly record: TurnRecord;
  readonly input: GenerationInput;
}
/** A completed duplicate or newly acquired turn reservation. */
export type ReservationResult =
  { readonly completed: CommittedTurn } | { readonly reservation: TurnReservation };

/** Reconstructs an already committed pair without repeating generation.
 * @param state - Owned transaction snapshot.
 * @param record - Completed turn metadata.
 * @returns Saved turn response.
 */
export function completedTurn(state: JournalState, record: TurnRecord): CommittedTurn {
  const journal = requireJournal(state);
  const userMessage = state.messages.find((message) => message.id === record.userMessageId);
  const modelMessage = state.messages.find((message) => message.id === record.modelMessageId);
  if (userMessage === undefined || modelMessage === undefined) throw conflict();
  return {
    requestId: record.id,
    journalId: journal.id,
    journal,
    userMessage,
    modelMessage,
    memories: state.memories
  };
}

function consumeQuota(state: JournalState, now: number): void {
  const day = new Date(now).toISOString().slice(0, 10);
  if (state.user.quotaDay !== day) {
    state.user.quotaDay = day;
    state.user.quotaCount = 0;
  }
  if (state.user.quotaCount >= LIMITS.dailyTurns)
    throw new AppError(
      429,
      'DAILY_LIMIT',
      'Your daily reflection limit has been reached. Please try again tomorrow.'
    );
  state.user.quotaCount++;
}

function checkCapacity(state: JournalState, existing: TurnRecord | undefined): void {
  if (
    state.messages.length + 2 > LIMITS.messages ||
    (existing === undefined && state.turns.length >= LIMITS.turns)
  )
    throw capacity();
}

/** Acquires one journal lease and a distributed per-UID generation allowance atomically.
 * @param state - Owned mutable transaction snapshot.
 * @param request - Validated request and idempotency key.
 * @returns Existing saved response or generation reservation.
 */
export function reserveTurn(state: JournalState, request: TurnRequest): ReservationResult {
  const journal = requireJournal(state);
  const hash = createHash('sha256').update(request.text).digest('hex');
  const existing = state.turns.find((turn) => turn.id === request.requestId);
  if (existing !== undefined && existing.hash !== hash)
    throw new AppError(409, 'IDEMPOTENCY_MISMATCH', 'This request ID was used for different text.');
  if (existing?.status === 'complete') return { completed: completedTurn(state, existing) };
  const now = Date.now();
  if (journal.lease !== null && journal.lease.expiresAt > now)
    throw new AppError(
      409,
      'TURN_IN_PROGRESS',
      'A reflection is already in progress. Please retry shortly.'
    );
  checkCapacity(state, existing);
  consumeQuota(state, now);
  const token = randomUUID();
  const record: TurnRecord = existing ?? {
    id: request.requestId,
    hash,
    status: 'pending',
    userMessageId: randomUUID(),
    modelMessageId: randomUUID(),
    version: journal.version
  };
  if (existing === undefined) state.turns.push(record);
  journal.lease = { requestId: request.requestId, token, expiresAt: now + 60000 };
  return {
    reservation: {
      token,
      record,
      version: journal.version,
      input: {
        summary: journal.summary,
        tone: journal.tone,
        messages: state.messages,
        memories: state.memories,
        userMessage: { id: record.userMessageId, text: request.text }
      }
    }
  };
}
