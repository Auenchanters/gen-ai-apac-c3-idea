// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { AuthProvider, useAuth } from './auth.js';
import type { AuthAdapter } from './types.js';

afterEach(cleanup);

function TestConsumer(): React.JSX.Element {
  const auth = useAuth();
  return (
    <div>
      <p>{auth.state.status}</p>
      <button
        onClick={() => {
          void auth.signIn();
        }}
      >
        Sign in
      </button>
      {auth.error !== null && <p role="alert">{auth.error}</p>}
    </div>
  );
}

describe('authentication state', () => {
  it('shows signed-out state and a recoverable popup failure', async () => {
    const adapter: AuthAdapter = {
      subscribe: (listener) => {
        listener({ status: 'signed-out' });
        return () => undefined;
      },
      signIn: () => Promise.reject(new Error('private upstream')),
      signOut: () => Promise.resolve(),
      getToken: () => Promise.resolve('token')
    };
    render(
      <AuthProvider adapter={adapter}>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByText('signed-out')).toBeDefined();
    });
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Sign-in did not finish. Allow the Google sign-in window and try again.'
    );
  });
});
