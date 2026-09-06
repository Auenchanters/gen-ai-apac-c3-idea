import { AppError, notFound } from '../../errors/app-error.js';
import { idSchema, uidSchema, type Journal, type JournalState } from './contracts.js';

/** Validates the complete path boundary.
 * @param uid - Verified identity.
 * @param id - Opaque journal identifier.
 */
export function validateScope(uid: string, id?: string): void {
  uidSchema.parse(uid);
  if (id !== undefined) idSchema.parse(id);
}

/** Prevents operations racing with account deletion.
 * @param state - Transaction snapshot.
 */
export function requireActiveUser(state: JournalState): void {
  if (state.user.deleting)
    throw new AppError(
      409,
      'DELETION_PENDING',
      'Data deletion is in progress. Please retry shortly.'
    );
}

/** Requires an owned, live journal inside the current transaction.
 * @param state - Transaction snapshot.
 * @returns Live journal metadata.
 */
export function requireJournal(state: JournalState): Journal {
  requireActiveUser(state);
  if (state.journal === null || state.journal.deleted) throw notFound();
  return state.journal;
}

/** Returns a safe conflict error for optimistic concurrency failures.
 * @returns Stable public conflict.
 */
export function conflict(): AppError {
  return new AppError(409, 'CONFLICT', 'This journal changed. Reload and retry.');
}

/** Fails closed when a configured completeness bound would be exceeded.
 * @returns Stable capacity error.
 */
export function capacity(): AppError {
  return new AppError(
    409,
    'CAPACITY_REACHED',
    'The storage limit has been reached. Export or delete older data before continuing.'
  );
}
