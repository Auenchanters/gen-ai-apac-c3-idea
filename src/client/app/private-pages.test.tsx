// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { App } from './app.js';
import type { AuthAdapter } from '../features/auth/types.js';

const auth: AuthAdapter = {
  subscribe(listener) {
    listener({ status: 'signed-in', uid: 'alice', name: 'Amrita' });
    return () => undefined;
  },
  getToken: () => Promise.resolve('test-token'),
  signIn: () => Promise.resolve(),
  signOut: () => Promise.resolve()
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
});

it('loads history and narrows it by title', async () => {
  window.history.replaceState({}, '', '/history');
  vi.stubGlobal('fetch', () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          journals: [
            {
              id: 'af354fcd-5c20-4b79-93e4-901f42b91550',
              title: 'A small win',
              tone: 'gentle',
              summary: 'Made progress.',
              themes: ['Work'],
              nextStep: 'Rest.',
              messageCount: 2,
              version: 1,
              createdAt: 0,
              updatedAt: 0
            }
          ],
          nextCursor: null
        })
      )
    )
  );
  render(<App authAdapter={auth} />);
  expect(await screen.findByRole('link', { name: 'A small win' }, { timeout: 5000 })).toBeDefined();
  await userEvent.type(screen.getByLabelText('Search titles, summaries, and topics'), 'unmatched');
  expect(screen.queryByRole('link', { name: 'A small win' })).toBeNull();
  expect(screen.getByText('No reflections match your filters.')).toBeDefined();
});

it('shows the selected Compass period and handles an empty journal', async () => {
  window.history.replaceState({}, '', '/compass');
  vi.stubGlobal('fetch', (_input: RequestInfo | URL, options?: RequestInit) => {
    const body: unknown = JSON.parse(typeof options?.body === 'string' ? options.body : '');
    const period =
      typeof body === 'object' && body !== null && 'period' in body ? body.period : 'week';
    return Promise.resolve(
      new Response(
        JSON.stringify({
          period,
          journalCount: 0,
          topics: [],
          memories: [],
          generatedAt: '2026-09-05T00:00:00Z'
        })
      )
    );
  });
  render(<App authAdapter={auth} />);
  expect(await screen.findByText('Your patterns will appear here.')).toBeDefined();
  await userEvent.click(screen.getByRole('button', { name: 'Past 30 days' }));
  expect(await screen.findByText('Your patterns will appear here.')).toBeDefined();
});

it('does not send a data deletion before confirmation', async () => {
  window.history.replaceState({}, '', '/privacy');
  let deleted = false;
  vi.stubGlobal('fetch', () => {
    deleted = true;
    return Promise.resolve(new Response(null, { status: 204 }));
  });
  render(<App authAdapter={auth} />);
  await userEvent.click(await screen.findByRole('button', { name: 'Delete all journal data' }));
  expect(deleted).toBe(false);
  await userEvent.type(screen.getByLabelText('Type DELETE to confirm'), 'DELETE');
  await userEvent.click(screen.getByRole('button', { name: 'Permanently delete' }));
  expect(await screen.findByText('Your journal data has been deleted.')).toBeDefined();
  expect(deleted).toBe(true);
});
