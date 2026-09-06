import {
  type CollectionReference,
  type DocumentData,
  type Firestore,
  type Transaction
} from 'firebase-admin/firestore';
import { type z } from 'zod';
import {
  journalSchema,
  LIMITS,
  memorySchema,
  messageSchema,
  turnRecordSchema,
  userStateSchema,
  type Journal,
  type JournalState
} from './contracts.js';
import type { JournalStore } from './journal-store.js';
import { capacity, requireActiveUser, validateScope } from './repository-guards.js';

async function readCollection<T>(
  transaction: Transaction,
  reference: CollectionReference,
  schema: z.ZodType<T>,
  maximum: number
): Promise<T[]> {
  const result = await transaction.get(reference.limit(maximum + 1));
  if (result.size > maximum) throw capacity();
  return result.docs.map((document) => schema.parse({ ...document.data(), id: document.id }));
}

function writeCollection<T extends { id: string }>(
  transaction: Transaction,
  reference: CollectionReference,
  before: T[],
  after: T[]
): void {
  const previous = new Map(before.map((item) => [item.id, item]));
  for (const item of after) {
    if (JSON.stringify(previous.get(item.id)) !== JSON.stringify(item))
      transaction.set(reference.doc(item.id), item);
    previous.delete(item.id);
  }
  for (const id of previous.keys()) transaction.delete(reference.doc(id));
}

async function readState(
  transaction: Transaction,
  firestore: Firestore,
  uid: string,
  id: string
): Promise<JournalState> {
  const userRef = firestore.collection('users').doc(uid);
  const journalRef = userRef.collection('journals').doc(id);
  const [user, journal, messages, memories, turns] = await Promise.all([
    transaction.get(userRef),
    transaction.get(journalRef),
    readCollection(transaction, journalRef.collection('messages'), messageSchema, LIMITS.messages),
    readCollection(transaction, journalRef.collection('memories'), memorySchema, LIMITS.memories),
    readCollection(transaction, journalRef.collection('turns'), turnRecordSchema, LIMITS.turns)
  ]);
  return {
    user: userStateSchema.parse(
      user.data() ?? { deleting: false, journalCount: 0, quotaDay: '', quotaCount: 0 }
    ),
    journal: journal.exists ? journalSchema.parse({ ...journal.data(), id: journal.id }) : null,
    messages,
    memories,
    turns
  };
}

function writeState(
  transaction: Transaction,
  firestore: Firestore,
  scope: { uid: string; id: string },
  states: { before: JournalState; after: JournalState }
): void {
  const userRef = firestore.collection('users').doc(scope.uid);
  const journalRef = userRef.collection('journals').doc(scope.id);
  const { before, after } = states;
  if (JSON.stringify(before.user) !== JSON.stringify(after.user))
    transaction.set(userRef, after.user);
  if (after.journal !== null && JSON.stringify(before.journal) !== JSON.stringify(after.journal))
    transaction.set(journalRef, after.journal);
  writeCollection(transaction, journalRef.collection('messages'), before.messages, after.messages);
  writeCollection(transaction, journalRef.collection('memories'), before.memories, after.memories);
  writeCollection(transaction, journalRef.collection('turns'), before.turns, after.turns);
}

/** Creates the production Admin Firestore adapter; it never accepts arbitrary paths.
 * @param firestore - ADC-initialized Admin Firestore instance.
 * @returns Scoped transaction and recursive-deletion adapter.
 */
export function createFirestoreStore(firestore: Firestore): JournalStore {
  return {
    async transact<T>(uid: string, id: string, operation: (state: JournalState) => T): Promise<T> {
      validateScope(uid, id);
      return firestore.runTransaction(async (transaction) => {
        const state = await readState(transaction, firestore, uid, id);
        const before = structuredClone(state);
        const result = operation(state);
        writeState(transaction, firestore, { uid, id }, { before, after: state });
        return result;
      });
    },
    async list(uid: string): Promise<Journal[]> {
      validateScope(uid);
      return firestore.runTransaction(async (transaction) => {
        const userRef = firestore.collection('users').doc(uid);
        const user = await transaction.get(userRef);
        const data: DocumentData | undefined = user.data();
        if (data !== undefined)
          requireActiveUser({
            user: userStateSchema.parse(data),
            journal: null,
            messages: [],
            memories: [],
            turns: []
          });
        return (
          await readCollection(
            transaction,
            userRef.collection('journals'),
            journalSchema,
            LIMITS.journals
          )
        ).filter((journal) => !journal.deleted);
      });
    },
    async eraseJournal(uid: string, id: string): Promise<void> {
      validateScope(uid, id);
      await firestore.recursiveDelete(
        firestore.collection('users').doc(uid).collection('journals').doc(id)
      );
    },
    async eraseUser(uid: string): Promise<void> {
      validateScope(uid);
      const userRef = firestore.collection('users').doc(uid);
      // Keep the deletion barrier until every descendant has been erased.
      await firestore.recursiveDelete(userRef.collection('journals'));
      await firestore.recursiveDelete(userRef.collection('compass'));
      await userRef.delete();
    }
  };
}
