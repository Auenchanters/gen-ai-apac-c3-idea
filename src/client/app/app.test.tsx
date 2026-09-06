// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from './app.js';
import type { AuthAdapter, AuthState } from '../features/auth/types.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
});
const journal = {
  id: 'c26b9a1a-45e7-42c7-971e-ddd6410b9277',
  title: 'A new direction',
  tone: 'gentle',
  summary: '',
  themes: [],
  nextStep: '',
  messageCount: 0,
  version: 1,
  createdAt: 0,
  updatedAt: 0
};

function adapter(): AuthAdapter {
  let notify: (state: AuthState) => void = () => undefined;
  return {
    subscribe(listener) {
      notify = listener;
      listener({ status: 'signed-out' });
      return () => undefined;
    },
    signIn: () => {
      notify({ status: 'signed-in', uid: 'alice', name: 'Amrita' });
      return Promise.resolve();
    },
    signOut: () => {
      notify({ status: 'signed-out' });
      return Promise.resolve();
    },
    getToken: () => Promise.resolve('test-token')
  };
}

describe('Daymark product journey', () => {
  it('signs in, creates a journal and preserves an unsaved turn on failure', async () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined
    }));
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>((input, options) => {
        const path = input instanceof Request ? input.url : String(input);
        if (path.endsWith('/turns'))
          return Promise.resolve(
            new Response('{"error":{"code":"GENERATION_UNAVAILABLE"}}', { status: 503 })
          );
        if (path === '/api/journals' && options?.method === 'POST')
          return Promise.resolve(new Response(JSON.stringify(journal), { status: 201 }));
        if (path.startsWith(`/api/journals/${journal.id}`))
          return Promise.resolve(
            new Response(JSON.stringify({ journal, messages: [], memories: [] }))
          );
        return Promise.resolve(new Response(JSON.stringify({ journals: [], nextCursor: null })));
      })
    );
    render(<App authAdapter={adapter()} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Continue with Google' }));
    await userEvent.type(
      await screen.findByLabelText('Journal title', undefined, { timeout: 20000 }),
      'A new direction'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Start a journal' }));
    const composer = await screen.findByLabelText('Your reflection', undefined, { timeout: 20000 });
    await userEvent.type(composer, 'I am considering a new direction.');
    await userEvent.click(screen.getByRole('button', { name: 'Send reflection' }));
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Gemini is unavailable');
    });
    expect((composer as HTMLTextAreaElement).value).toBe('I am considering a new direction.');
    expect(screen.getByRole('button', { name: 'Retry reflection' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Edit draft before a new attempt' })).toBeNull();
  }, 30000);
});
