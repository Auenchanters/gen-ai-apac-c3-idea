// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { AuthProvider } from '../auth/auth.js';
import type { AuthAdapter } from '../auth/types.js';
import type { Memory } from '../../lib/contracts.js';
import { MemoryPanel } from './memory-panel.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const item: Memory = {
  id: '32abca91-998f-4673-926d-47c3b67d21a0',
  kind: 'commitment',
  text: 'Make time for a walk.',
  status: 'proposed',
  sourceMessageIds: ['c6992cb7-d22c-4e03-80be-c629b0c8340b'],
  revision: 0,
  createdAt: 0,
  updatedAt: 0
};
const auth: AuthAdapter = {
  subscribe(listener) {
    listener({ status: 'signed-in', uid: 'alice', name: 'Amrita' });
    return () => undefined;
  },
  getToken: () => Promise.resolve('test-token'),
  signIn: () => Promise.resolve(),
  signOut: () => Promise.resolve()
};
function Harness(): React.JSX.Element {
  const [items, setItems] = useState([item]);
  return (
    <AuthProvider adapter={auth}>
      <MemoryPanel
        journalId="704d9e67-3bf9-42f9-bf24-e5381c602fef"
        items={items}
        onChange={setItems}
        messages={[]}
        summary="A reflective day."
        nextStep="Take a walk."
      />
    </AuthProvider>
  );
}
function EmptyHarness(): React.JSX.Element {
  const [items, setItems] = useState([item]);
  return (
    <AuthProvider adapter={auth}>
      <MemoryPanel
        journalId="704d9e67-3bf9-42f9-bf24-e5381c602fef"
        items={items}
        onChange={setItems}
        messages={[]}
        summary=""
        nextStep=""
      />
    </AuthProvider>
  );
}
it('keeps a proposal unapproved until the saved approval is confirmed', async () => {
  let payload: unknown;
  vi.stubGlobal('fetch', (_input: RequestInfo | URL, options?: RequestInit) => {
    payload = JSON.parse(typeof options?.body === 'string' ? options.body : '');
    return Promise.resolve(
      new Response(JSON.stringify({ ...item, status: 'approved', revision: 1 }))
    );
  });
  render(<Harness />);
  await userEvent.click(screen.getByRole('button', { name: 'Approve memory' }));
  expect(await screen.findByText('approved')).toBeDefined();
  expect(payload).toEqual({ revision: 0, action: 'approve' });
  expect(screen.getByRole('button', { name: 'Retire memory' })).toBeDefined();
});

it('shows empty summary guidance and removes a deleted memory from the panel', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ deleted: true })))
  );
  render(<EmptyHarness />);
  expect(screen.getByText('Your first reflection will create a summary here.')).toBeDefined();
  expect(screen.getByText('Source is not available in this view.')).toBeDefined();
  await userEvent.click(screen.getByRole('button', { name: 'Delete memory' }));
  await userEvent.type(screen.getByLabelText('Type DELETE to confirm'), 'DELETE');
  await userEvent.click(screen.getByRole('button', { name: 'Permanently delete' }));
  expect(await screen.findByText('No suggested memories yet. Nothing to approve.')).toBeDefined();
});
