// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../auth/auth.js';
import type { AuthAdapter } from '../auth/types.js';
import Privacy from './privacy.js';

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

const detail = {
  journal: {
    id: 'c26b9a1a-45e7-42c7-971e-ddd6410b9277',
    title: 'Today',
    tone: 'gentle' as const,
    summary: 'A reflection',
    themes: ['Work'],
    nextStep: 'Rest',
    messageCount: 0,
    version: 0,
    createdAt: 0,
    updatedAt: 0
  },
  messages: [],
  memories: []
};

function renderPrivacy(): void {
  render(
    <AuthProvider adapter={auth}>
      <Privacy />
    </AuthProvider>
  );
}

describe('privacy controls', () => {
  it('creates a private JSON export and reports completion', async () => {
    const createObjectURL = vi.fn(() => 'blob:daymark-export');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ exportedAt: '2026-09-06T00:00:00Z', journals: [detail] }))
        )
    );
    renderPrivacy();
    await userEvent.click(screen.getByRole('button', { name: 'Export journal data' }));
    expect(
      await screen.findByText('Your export is ready. Keep the downloaded file private.')
    ).toBeDefined();
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Your writing. Your choice.')).toBeDefined();
  });

  it('keeps the privacy page usable when export preparation fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('upstream', { status: 503 })));
    renderPrivacy();
    await userEvent.click(screen.getByRole('button', { name: 'Export journal data' }));
    expect(
      await screen.findByText('Your export could not be prepared. Please try again.')
    ).toBeDefined();
    expect(screen.getByText('A writing companion, not medical care')).toBeDefined();
  });
});
