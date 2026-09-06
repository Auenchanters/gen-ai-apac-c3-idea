// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../auth/auth.js';
import type { AuthAdapter } from '../auth/types.js';
import CompassPage from './compass.js';

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

const memory = {
  id: '32abca91-998f-4673-926d-47c3b67d21a0',
  kind: 'fact' as const,
  text: 'Enjoys a quiet walk',
  status: 'approved' as const,
  sourceMessageIds: ['c6992cb7-d22c-4e03-80be-c629b0c8340b'],
  revision: 1,
  createdAt: 0,
  updatedAt: 0
};

function renderCompass(): void {
  render(
    <AuthProvider adapter={auth}>
      <CompassPage />
    </AuthProvider>
  );
}

describe('Reflection Compass view', () => {
  it('renders topic and approved-memory details for both periods', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        calls++;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              period: calls > 1 ? 'month' : 'week',
              journalCount: 2,
              topics: [
                { topic: 'focus', count: 1 },
                { topic: 'work', count: 2 }
              ],
              memories: [memory],
              generatedAt: '2026-09-06T00:00:00Z'
            })
          )
        );
      })
    );
    renderCompass();
    expect(
      await screen.findByText('Based on 2 saved journals updated in this period.')
    ).toBeDefined();
    expect(screen.getByText('1 journal')).toBeDefined();
    expect(screen.getByText('2 journals')).toBeDefined();
    expect(screen.getByText('Enjoys a quiet walk')).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: 'Past 30 days' }));
    expect(
      (await screen.findByRole('button', { name: 'Past 30 days' })).getAttribute('aria-pressed')
    ).toBe('true');
  });

  it('shows a safe error and exposes an explicit retry action', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('upstream', { status: 500 })));
    renderCompass();
    expect(await screen.findByText('We could not load this. Please try again.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDefined();
  });

  it('uses singular copy and explains an empty memory set', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            period: 'week',
            journalCount: 1,
            topics: [{ topic: 'focus', count: 1 }],
            memories: [],
            generatedAt: '2026-09-06T00:00:00Z'
          })
        )
      )
    );
    renderCompass();
    expect(
      await screen.findByText('Based on 1 saved journal updated in this period.')
    ).toBeDefined();
    expect(screen.getByText('No approved memories in this period.')).toBeDefined();
  });
});
