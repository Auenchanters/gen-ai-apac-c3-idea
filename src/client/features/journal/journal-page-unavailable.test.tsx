// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/use-query.js', () => ({
  useQuery: () => ({ data: null, loading: false, error: null, reload: vi.fn() })
}));

import { AuthProvider } from '../auth/auth.js';
import type { AuthAdapter } from '../auth/types.js';
import JournalPage from './journal-page.js';

afterEach(cleanup);

const auth: AuthAdapter = {
  subscribe(listener) {
    listener({ status: 'signed-in', uid: 'alice', name: 'Amrita' });
    return () => undefined;
  },
  getToken: () => Promise.resolve('test-token'),
  signIn: () => Promise.resolve(),
  signOut: () => Promise.resolve()
};

describe('journal unavailable state', () => {
  it('renders a safe fallback when a valid route has no data', () => {
    render(
      <MemoryRouter initialEntries={['/journals/c26b9a1a-45e7-42c7-971e-ddd6410b9277']}>
        <AuthProvider adapter={auth}>
          <Routes>
            <Route path="/journals/:journalId" element={<JournalPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('This journal is unavailable.')).toBeDefined();
  });
});
