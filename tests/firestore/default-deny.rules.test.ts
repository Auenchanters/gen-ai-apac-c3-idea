import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, describe, it } from 'vitest';

let environment: RulesTestEnvironment;

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'daymark-test',
    firestore: {
      rules: await (await import('node:fs/promises')).readFile('firestore.rules', 'utf8')
    }
  });
});

afterAll(async () => {
  await environment.cleanup();
});

describe('default-deny Firestore scaffold', () => {
  it('rejects unauthenticated reads and writes', async () => {
    const firestore = environment.unauthenticatedContext().firestore();
    const journal = doc(firestore, 'users/alice/journals/one');

    await assertFails(getDoc(journal));
    await assertFails(setDoc(journal, { title: 'private' }));
  });

  it('rejects authenticated client reads and writes', async () => {
    const firestore = environment.authenticatedContext('alice').firestore();
    const journal = doc(firestore, 'users/alice/journals/one');

    await assertFails(getDoc(journal));
    await assertFails(setDoc(journal, { title: 'private' }));
  });
});
