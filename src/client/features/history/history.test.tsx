// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../auth/auth.js';
import type { AuthAdapter } from '../auth/types.js';
import type { Journal } from '../../lib/contracts.js';
import History from './history.js';

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

function journal(id: string, title: string, updatedAt: number, summary: string): Journal {
  return {
    id,
    title,
    tone: 'gentle' as const,
    summary,
    themes: ['Work'],
    nextStep: '',
    messageCount: 2,
    version: 1,
    createdAt: updatedAt,
    updatedAt
  };
}

describe('history filters and deletion', () => {
  it('filters by date, renders open-page copy, and reloads after deletion', async () => {
    const now = Date.now();
    let requests = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((_input: RequestInfo | URL, options?: RequestInit) => {
        requests++;
        if (options?.method === 'DELETE')
          return Promise.resolve(new Response(null, { status: 204 }));
        return Promise.resolve(
          new Response(
            JSON.stringify({
              journals: [
                journal('c26b9a1a-45e7-42c7-971e-ddd6410b9277', 'Current note', now, ''),
                journal(
                  '704d9e67-3bf9-42f9-bf24-e5381c602fef',
                  'Older note',
                  now - 31 * 86400000,
                  'Older summary'
                )
              ],
              nextCursor: null
            })
          )
        );
      })
    );
    render(
      <BrowserRouter>
        <AuthProvider adapter={auth}>
          <History />
        </AuthProvider>
      </BrowserRouter>
    );
    expect(
      await screen.findByRole('link', { name: 'Current note' }, { timeout: 20000 })
    ).toBeDefined();
    expect(screen.getByText('An open page, ready when you are.')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Older note' })).toBeDefined();
    await userEvent.selectOptions(screen.getByLabelText('Last updated'), '7');
    expect(screen.queryByRole('link', { name: 'Older note' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Current note' })).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: 'Delete Current note' }));
    await userEvent.type(screen.getByLabelText('Type DELETE to confirm'), 'DELETE');
    await userEvent.click(screen.getByRole('button', { name: 'Permanently delete' }));
    expect(requests).toBe(3);
  });

  it('shows safe load failure and the first-journal empty state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('upstream', { status: 500 })));
    render(
      <BrowserRouter>
        <AuthProvider adapter={auth}>
          <History />
        </AuthProvider>
      </BrowserRouter>
    );
    expect(await screen.findByText('We could not load this. Please try again.')).toBeDefined();

    cleanup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ journals: [], nextCursor: null })))
    );
    render(
      <BrowserRouter>
        <AuthProvider adapter={auth}>
          <History />
        </AuthProvider>
      </BrowserRouter>
    );
    expect(await screen.findByRole('heading', { name: 'Your story starts here.' })).toBeDefined();
  });
});
