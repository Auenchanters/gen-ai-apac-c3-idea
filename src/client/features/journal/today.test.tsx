// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';

import { AuthProvider } from '../auth/auth.js';
import type { AuthAdapter } from '../auth/types.js';
import { ApiClient } from '../../lib/api.js';
import Today from './today.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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

function renderToday(): void {
  render(
    <MemoryRouter>
      <AuthProvider adapter={auth}>
        <Today />
      </AuthProvider>
      <LocationProbe />
    </MemoryRouter>
  );
}

function LocationProbe(): React.JSX.Element {
  return <output>{useLocation().pathname}</output>;
}

const journal = {
  id: 'c26b9a1a-45e7-42c7-971e-ddd6410b9277',
  title: 'A new direction',
  tone: 'practical' as const,
  summary: '',
  themes: [],
  nextStep: '',
  messageCount: 0,
  version: 0,
  createdAt: 0,
  updatedAt: 0
};

describe('new journal form', () => {
  it('selects a tone and navigates after a confirmed create', async () => {
    const network = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(journal), { status: 201 }));
    vi.stubGlobal('fetch', network);
    renderToday();
    const start = screen.getByRole('button', { name: 'Start a journal' });
    expect(start.hasAttribute('disabled')).toBe(true);
    await userEvent.type(screen.getByLabelText('Journal title'), ' A new direction ');
    await userEvent.click(screen.getByLabelText('Practically'));
    await userEvent.click(start);
    expect(await screen.findByText(`/journals/${journal.id}`)).toBeDefined();
    expect(JSON.parse(String(network.mock.calls[0]?.[1]?.body))).toEqual({
      title: 'A new direction',
      tone: 'practical'
    });
  });

  it('shows safe API and network failures without losing the form', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"error":{"code":"INVALID_INPUT"}}', { status: 400 }))
    );
    renderToday();
    await userEvent.type(screen.getByLabelText('Journal title'), 'A title');
    await userEvent.click(screen.getByRole('button', { name: 'Start a journal' }));
    expect(await screen.findByText('Check your entry and try again.')).toBeDefined();

    cleanup();
    vi.spyOn(ApiClient.prototype, 'send').mockRejectedValue(new Error('private network'));
    renderToday();
    await userEvent.type(screen.getByLabelText('Journal title'), 'Another title');
    await userEvent.click(screen.getByRole('button', { name: 'Start a journal' }));
    expect(await screen.findByText('We could not start your journal. Try again.')).toBeDefined();
  });
});
