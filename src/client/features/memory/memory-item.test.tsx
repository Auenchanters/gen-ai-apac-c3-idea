// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../auth/auth.js';
import type { AuthAdapter } from '../auth/types.js';
import type { Memory } from '../../lib/contracts.js';
import { MemoryItem } from './memory-item.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const auth: AuthAdapter = {
  subscribe(listener) {
    listener({ status: 'signed-in', uid: 'alice', name: 'Amrita' });
    return () => undefined;
  },
  getToken: () => Promise.resolve('test-token'),
  signIn: () => Promise.resolve(),
  signOut: () => Promise.resolve()
};

const proposed: Memory = {
  id: '32abca91-998f-4673-926d-47c3b67d21a0',
  kind: 'commitment',
  text: 'Make time for a walk.',
  status: 'proposed',
  sourceMessageIds: ['c6992cb7-d22c-4e03-80be-c629b0c8340b'],
  revision: 0,
  createdAt: 0,
  updatedAt: 0
};

function renderItem(item: Memory, onSave = vi.fn()): ReturnType<typeof vi.fn> {
  render(
    <AuthProvider adapter={auth}>
      <ul>
        <MemoryItem
          item={item}
          journalId="704d9e67-3bf9-42f9-bf24-e5381c602fef"
          sourceText="A source thought"
          onSave={onSave}
        />
      </ul>
    </AuthProvider>
  );
  return onSave;
}

describe('memory consent controls', () => {
  it('rejects a proposal and preserves source provenance in the view', async () => {
    const saved = { ...proposed, status: 'rejected' as const, revision: 1 };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(saved))));
    const onSave = renderItem(proposed);
    expect(screen.getByText('A source thought')).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: 'Reject memory' }));
    expect(onSave).toHaveBeenCalledWith(saved);
  });

  it('supports editing approved memory and cancelling a proposed edit', async () => {
    const approved: Memory = { ...proposed, status: 'approved', revision: 1 };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(approved))));
    renderItem(approved);
    await userEvent.click(screen.getByRole('button', { name: 'Edit memory' }));
    const editor = screen.getByRole('textbox', { name: 'Memory text' });
    await userEvent.clear(editor);
    await userEvent.type(editor, 'A calmer walk');
    await userEvent.click(screen.getByRole('button', { name: 'Save memory' }));
    expect(await screen.findByText('approved')).toBeDefined();

    cleanup();
    vi.stubGlobal('fetch', vi.fn());
    renderItem(proposed);
    await userEvent.click(screen.getByRole('button', { name: 'Edit memory' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel edit' }));
    expect(screen.getByRole('button', { name: 'Approve memory' })).toBeDefined();
  });

  it('shows a safe update failure and can retire or delete an approved item', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad', { status: 409 })));
    renderItem(proposed);
    await userEvent.click(screen.getByRole('button', { name: 'Approve memory' }));
    expect(
      await screen.findByText('This memory could not be updated. Reload the journal and try again.')
    ).toBeDefined();

    cleanup();
    const approved: Memory = { ...proposed, status: 'approved', revision: 2 };
    let payload: unknown;
    vi.stubGlobal(
      'fetch',
      vi.fn((_input: RequestInfo | URL, options?: RequestInit) => {
        payload = typeof options?.body === 'string' ? JSON.parse(options.body) : undefined;
        const response =
          payload !== undefined &&
          payload !== null &&
          typeof payload === 'object' &&
          'action' in payload &&
          payload.action === 'delete'
            ? { deleted: true }
            : { ...approved, status: 'retired' };
        return Promise.resolve(new Response(JSON.stringify(response)));
      })
    );
    const onSave = renderItem(approved);
    await userEvent.click(screen.getByRole('button', { name: 'Retire memory' }));
    expect(onSave).toHaveBeenCalledWith({ ...approved, status: 'retired' });
    await userEvent.click(screen.getByRole('button', { name: 'Delete memory' }));
    await userEvent.type(screen.getByLabelText('Type DELETE to confirm'), 'DELETE');
    await userEvent.click(screen.getByRole('button', { name: 'Permanently delete' }));
    expect(onSave).toHaveBeenCalledWith(null);

    cleanup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad', { status: 500 })));
    renderItem(approved);
    await userEvent.click(screen.getByRole('button', { name: 'Delete memory' }));
    await userEvent.type(screen.getByLabelText('Type DELETE to confirm'), 'DELETE');
    await userEvent.click(screen.getByRole('button', { name: 'Permanently delete' }));
    expect(
      await screen.findByText(
        'Deletion could not be confirmed. Please retry before creating new entries.'
      )
    ).toBeDefined();
  });
});
