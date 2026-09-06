// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AuthProvider } from '../auth/auth.js';
import type { AuthAdapter } from '../auth/types.js';
import JournalPage from './journal-page.js';

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
const journalId = 'c26b9a1a-45e7-42c7-971e-ddd6410b9277';
const requestId = 'cc35e7f6-185a-4aa9-bb65-6ee6cba1e4fe';
const detail = {
  journal: {
    id: journalId,
    title: 'A saved thought',
    tone: 'gentle' as const,
    summary: 'A saved summary',
    themes: ['Work'],
    nextStep: 'Rest',
    messageCount: 2,
    version: 1,
    createdAt: 0,
    updatedAt: 0
  },
  messages: [
    {
      id: 'af354fcd-5c20-4b79-93e4-901f42b91550',
      role: 'user' as const,
      text: 'A thought',
      sequence: 0,
      requestId,
      createdAt: 1
    },
    {
      id: 'b7a49c6d-7fc0-4d3c-9a4f-2d58b4d6656b',
      role: 'model' as const,
      text: 'A reflection',
      sequence: 1,
      requestId,
      createdAt: 1
    }
  ],
  memories: []
};

function renderPage(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider adapter={auth}>
        <Routes>
          <Route path="/journals/:journalId" element={<JournalPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('journal route loading states', () => {
  it('rejects a malformed journal identifier before making a request', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    renderPage('/journals/not-a-uuid');
    expect(screen.getByText('This journal is unavailable.')).toBeDefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('shows loading and then the saved conversation', async () => {
    let resolve: (response: Response) => void = () => undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((finish) => {
            resolve = finish;
          })
      )
    );
    renderPage(`/journals/${journalId}`);
    expect(screen.getByRole('status').textContent).toContain('Opening your journal');
    await vi.waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalled();
    });
    resolve(new Response(JSON.stringify(detail)));
    expect(await screen.findByRole('heading', { name: 'A saved thought' })).toBeDefined();
    expect(screen.getByText('A thought')).toBeDefined();
    expect(screen.getByText('A reflection')).toBeDefined();
    expect(screen.getByText('A saved summary')).toBeDefined();
    expect(screen.getByText('Rest')).toBeDefined();
  });

  it('shows a safe load error with retry', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(new Response('{"error":{"code":"NOT_FOUND"}}', { status: 404 }));
    vi.stubGlobal('fetch', fetchSpy);
    renderPage(`/journals/${journalId}`);
    expect(await screen.findByText('We could not load this. Please try again.')).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
