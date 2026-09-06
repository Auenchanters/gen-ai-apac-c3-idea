import type { Journal, JournalState } from './contracts.js';

/** Infrastructure contract; every operation receives UID and opaque IDs separately. */
export interface JournalStore {
  transact<T>(uid: string, journalId: string, operation: (state: JournalState) => T): Promise<T>;
  list(uid: string): Promise<Journal[]>;
  eraseJournal(uid: string, journalId: string): Promise<void>;
  eraseUser(uid: string): Promise<void>;
}
