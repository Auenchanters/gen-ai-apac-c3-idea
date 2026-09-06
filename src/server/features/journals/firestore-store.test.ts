import type { Firestore } from 'firebase-admin/firestore';
import { describe, expect, it, vi } from 'vitest';

import {
  LIMITS,
  type Journal,
  type JournalMessage,
  type MemoryItem,
  type TurnRecord
} from './contracts.js';
import { createFirestoreStore } from './firestore-store.js';

const uid = 'alice';
const journalId = 'c26b9a1a-45e7-42c7-971e-ddd6410b9277';
const requestId = 'cc35e7f6-185a-4aa9-bb65-6ee6cba1e4fe';
const messageId = 'af354fcd-5c20-4b79-93e4-901f42b91550';
const modelMessageId = 'b7a49c6d-7fc0-4d3c-9a4f-2d58b4d6656b';
const memoryId = '32abca91-998f-4673-926d-47c3b67d21a0';

interface DocumentReference {
  readonly kind: 'document';
  readonly path: string;
  readonly id: string;
  collection: (name: string) => CollectionReference;
  delete: () => Promise<void>;
}
interface CollectionReference {
  readonly kind: 'collection';
  readonly path: string;
  doc: (id: string) => DocumentReference;
  limit: (maximum: number) => QueryReference;
}
interface QueryReference {
  readonly kind: 'query';
  readonly path: string;
  readonly maximum: number;
}
type Reference = DocumentReference | CollectionReference | QueryReference;
interface Snapshot {
  readonly id: string;
  readonly exists: boolean;
  data: () => unknown;
}
interface FakeTransaction {
  get: (reference: Reference) => Promise<Snapshot | { size: number; docs: Snapshot[] }>;
  set: (reference: DocumentReference, value: unknown) => void;
  delete: (reference: DocumentReference) => void;
}

function fakeFirestore(): {
  firestore: Firestore;
  documents: Map<string, unknown>;
  transaction: FakeTransaction;
  recursiveDelete: ReturnType<typeof vi.fn>;
} {
  const documents = new Map<string, unknown>();
  const makeDocument = (path: string): DocumentReference => ({
    kind: 'document',
    path,
    id: path.split('/').at(-1) ?? path,
    collection: (name) => makeCollection(`${path}/${name}`),
    delete: () => {
      documents.delete(path);
      return Promise.resolve();
    }
  });
  const makeCollection = (path: string): CollectionReference => ({
    kind: 'collection',
    path,
    doc: (id) => makeDocument(`${path}/${id}`),
    limit: (maximum) => ({ kind: 'query', path, maximum })
  });
  const snapshot = (path: string): Snapshot => ({
    id: path.split('/').at(-1) ?? path,
    exists: documents.has(path),
    data: () => documents.get(path)
  });
  const transaction: FakeTransaction = {
    get: (reference) => {
      if (reference.kind === 'query') {
        const prefix = `${reference.path}/`;
        const docs = [...documents.entries()]
          .filter(([path]) => path.startsWith(prefix) && !path.slice(prefix.length).includes('/'))
          .slice(0, reference.maximum)
          .map(([path]) => snapshot(path));
        return Promise.resolve({ size: docs.length, docs });
      }
      return Promise.resolve(snapshot(reference.path));
    },
    set: (reference, value) => {
      documents.set(reference.path, structuredClone(value));
    },
    delete: (reference) => {
      documents.delete(reference.path);
    }
  };
  const recursiveDelete = vi.fn((reference: DocumentReference | CollectionReference) => {
    const prefix = `${reference.path}/`;
    for (const path of documents.keys())
      if (path === reference.path || path.startsWith(prefix)) documents.delete(path);
    return Promise.resolve();
  });
  const firestore = {
    collection: (name: string) => makeCollection(name),
    runTransaction: <T>(operation: (current: FakeTransaction) => Promise<T>) =>
      operation(transaction),
    recursiveDelete
  } as unknown as Firestore;
  return { firestore, documents, transaction, recursiveDelete };
}

const journal: Journal = {
  id: journalId,
  title: 'Today',
  tone: 'gentle',
  summary: '',
  themes: [],
  nextStep: '',
  messageCount: 0,
  version: 0,
  createdAt: 0,
  updatedAt: 0,
  deleted: false,
  lease: null
};
const message: JournalMessage = {
  id: messageId,
  role: 'user',
  text: 'A thought',
  sequence: 0,
  requestId,
  createdAt: 0
};
const memory: MemoryItem = {
  id: memoryId,
  kind: 'fact',
  text: 'Likes walking',
  status: 'proposed',
  sourceMessageIds: [messageId],
  revision: 0,
  createdAt: 0,
  updatedAt: 0
};
const turn: TurnRecord = {
  id: requestId,
  hash: 'hash',
  status: 'pending',
  userMessageId: messageId,
  modelMessageId,
  version: 0
};

describe('Firestore journal store', () => {
  it('reads and writes scoped state, including updates and descendant deletion', async () => {
    const fake = fakeFirestore();
    const store = createFirestoreStore(fake.firestore);
    await store.transact(uid, journalId, (state) => {
      state.user.journalCount = 1;
      state.journal = structuredClone(journal);
      state.messages.push(message);
      state.memories.push(memory);
      state.turns.push(turn);
      return state.journal;
    });
    expect(await store.list(uid)).toEqual([journal]);
    const unchanged = await store.transact(uid, journalId, (state) => state.journal?.title);
    expect(unchanged).toBe('Today');
    await store.transact(uid, journalId, (state) => {
      const firstMessage = state.messages[0];
      if (firstMessage === undefined) throw new Error('Fixture message missing');
      firstMessage.text = 'Updated thought';
      state.memories = [];
      state.turns = [];
      return undefined;
    });
    expect(
      fake.documents.get(`users/${uid}/journals/${journalId}/messages/${messageId}`)
    ).toMatchObject({
      text: 'Updated thought'
    });
    await store.eraseJournal(uid, journalId);
    expect(fake.recursiveDelete).toHaveBeenCalledWith(
      expect.objectContaining({ path: `users/${uid}/journals/${journalId}` })
    );
    await store.eraseUser(uid);
    expect(fake.recursiveDelete).toHaveBeenCalledWith(
      expect.objectContaining({ path: `users/${uid}/journals` })
    );
    expect(fake.recursiveDelete).toHaveBeenCalledWith(
      expect.objectContaining({ path: `users/${uid}/compass` })
    );
  });

  it('filters deleted journals, enforces deletion barriers, and rejects over-capacity collections', async () => {
    const fake = fakeFirestore();
    const store = createFirestoreStore(fake.firestore);
    fake.documents.set(`users/${uid}`, {
      deleting: false,
      journalCount: 1,
      quotaDay: '',
      quotaCount: 0
    });
    fake.documents.set(`users/${uid}/journals/${journalId}`, journal);
    const deleted: Journal = {
      ...journal,
      id: '704d9e67-3bf9-42f9-bf24-e5381c602fef',
      deleted: true
    };
    fake.documents.set(`users/${uid}/journals/${deleted.id}`, deleted);
    expect(await store.list(uid)).toEqual([journal]);
    fake.documents.set(`users/${uid}`, {
      deleting: true,
      journalCount: 1,
      quotaDay: '',
      quotaCount: 0
    });
    await expect(store.list(uid)).rejects.toMatchObject({ code: 'DELETION_PENDING' });

    const full = fakeFirestore();
    for (let index = 0; index <= LIMITS.journals; index++)
      full.documents.set(`users/${uid}/journals/journal-${String(index)}`, {});
    await expect(createFirestoreStore(full.firestore).list(uid)).rejects.toMatchObject({
      code: 'CAPACITY_REACHED'
    });
  });
});
