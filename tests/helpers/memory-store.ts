import type {
  Journal,
  JournalState,
  UserState
} from '../../src/server/features/journals/contracts.js';
import type { JournalStore } from '../../src/server/features/journals/journal-store.js';

/** Test-only transaction adapter with rollback and cross-journal user serialization.
 * @returns Isolated in-memory persistence for hermetic tests.
 */
export function createMemoryStore(): JournalStore {
  const users = new Map<string, UserState>();
  const journals = new Map<string, Map<string, JournalState>>();
  let queue: Promise<void> = Promise.resolve();
  return {
    transact<T>(uid: string, id: string, operation: (state: JournalState) => T): Promise<T> {
      const result = queue.then(() => {
        const state = structuredClone(
          journals.get(uid)?.get(id) ?? {
            journal: null,
            messages: [],
            memories: [],
            turns: [],
            user: { deleting: false, journalCount: 0, quotaDay: '', quotaCount: 0 }
          }
        );
        state.user = structuredClone(users.get(uid) ?? state.user);
        const value = operation(state);
        users.set(uid, state.user);
        const own = journals.get(uid) ?? new Map<string, JournalState>();
        if (state.journal !== null) own.set(id, state);
        journals.set(uid, own);
        return structuredClone(value);
      });
      queue = result.then(
        () => undefined,
        () => undefined
      );
      return result;
    },
    list(uid: string): Promise<Journal[]> {
      return queue.then(() =>
        structuredClone(
          [...(journals.get(uid)?.values() ?? [])].flatMap((item) =>
            item.journal === null || item.journal.deleted ? [] : [item.journal]
          )
        )
      );
    },
    eraseJournal(uid: string, id: string): Promise<void> {
      return queue.then(() => {
        journals.get(uid)?.delete(id);
      });
    },
    eraseUser(uid: string): Promise<void> {
      return queue.then(() => {
        journals.delete(uid);
        users.delete(uid);
      });
    }
  };
}
