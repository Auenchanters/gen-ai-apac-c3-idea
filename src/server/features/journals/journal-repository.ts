import { randomUUID } from 'node:crypto';
import {
  createJournalSchema,
  idSchema,
  LIMITS,
  listQuerySchema,
  type Journal,
  type JournalDetail
} from './contracts.js';
import type { JournalStore } from './journal-store.js';
import {
  capacity,
  conflict,
  requireActiveUser,
  requireJournal,
  validateScope
} from './repository-guards.js';

/** UID-scoped, bounded persistence facade with no public path input. */
export class JournalRepository {
  /** Creates a repository over a transactional infrastructure adapter.
   * @param store - Firestore or test-only storage adapter.
   */
  constructor(readonly store: JournalStore) {}

  /** Creates an owned journal subject to the per-account storage cap.
   * @param uid - Verified identity.
   * @param input - Strict title and tone payload.
   * @returns Saved metadata.
   */
  async createJournal(uid: string, input: unknown): Promise<Journal> {
    validateScope(uid);
    const payload = createJournalSchema.parse(input);
    const id = randomUUID();
    return this.store.transact(uid, id, (state) => {
      requireActiveUser(state);
      if (state.user.journalCount >= LIMITS.journals) throw capacity();
      const now = Date.now();
      state.journal = {
        id,
        ...payload,
        summary: '',
        themes: [],
        nextStep: '',
        messageCount: 0,
        version: 0,
        createdAt: now,
        updatedAt: now,
        deleted: false,
        lease: null
      };
      state.user.journalCount++;
      return state.journal;
    });
  }

  /** Lists a stable UUID-ordered page without exposing foreign cursors.
   * @param uid - Verified identity.
   * @param input - Bounded cursor and limit.
   * @returns Journal page and opaque continuation cursor.
   */
  async listJournals(
    uid: string,
    input: unknown
  ): Promise<{ journals: Journal[]; nextCursor: string | null }> {
    validateScope(uid);
    const query = listQuerySchema.parse(input);
    const all = (await this.store.list(uid)).sort((a, b) => a.id.localeCompare(b.id));
    if (all.length > LIMITS.journals) throw capacity();
    const page = all
      .filter((journal) => query.cursor === undefined || journal.id.localeCompare(query.cursor) > 0)
      .slice(0, query.limit + 1);
    const journals = page.slice(0, query.limit);
    return {
      journals,
      nextCursor: page.length > query.limit ? (journals.at(-1)?.id ?? null) : null
    };
  }

  /** Loads a complete conversation within documented storage bounds.
   * @param uid - Verified identity.
   * @param journalId - Opaque journal ID.
   * @returns Journal with ordered messages and Context Contract items.
   */
  async loadJournal(uid: string, journalId: string): Promise<JournalDetail> {
    validateScope(uid, journalId);
    return this.store.transact(uid, journalId, (state) => ({
      journal: requireJournal(state),
      messages: state.messages.sort((a, b) => a.sequence - b.sequence),
      memories: state.memories
    }));
  }

  /** Marks a journal before recursive deletion to reject in-flight commits.
   * @param uid - Verified identity.
   * @param journalId - Opaque journal ID.
   */
  async deleteJournal(uid: string, journalId: string): Promise<void> {
    validateScope(uid, journalId);
    await this.store.transact(uid, journalId, (state) => {
      requireActiveUser(state);
      if (state.journal?.deleted === true) return;
      const journal = requireJournal(state);
      journal.deleted = true;
      journal.lease = null;
      state.user.journalCount--;
    });
    await this.store.eraseJournal(uid, journalId);
  }

  /** Exports all data or fails explicitly if a bound is exceeded.
   * @param uid - Verified identity.
   * @returns Complete caller-owned data snapshot.
   */
  async exportData(uid: string): Promise<{ exportedAt: string; journals: JournalDetail[] }> {
    const listing = await this.listJournals(uid, { limit: LIMITS.journals });
    const journals = await Promise.all(
      listing.journals.map((journal) => this.loadJournal(uid, journal.id))
    );
    const confirmed = await this.listJournals(uid, { limit: LIMITS.journals });
    if (
      JSON.stringify(confirmed.journals.map(({ id, version }) => ({ id, version }))) !==
      JSON.stringify(listing.journals.map(({ id, version }) => ({ id, version })))
    )
      throw conflict();
    return { exportedAt: new Date().toISOString(), journals };
  }

  /** Tombstones the account before recursively removing all descendants.
   * @param uid - Verified identity.
   */
  async deleteAllUserData(uid: string): Promise<void> {
    validateScope(uid);
    await this.store.transact(uid, idSchema.parse(randomUUID()), (state) => {
      state.user.deleting = true;
    });
    await this.store.eraseUser(uid);
  }
}
