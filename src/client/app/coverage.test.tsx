// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from './app.js';
import { useAuth } from '../features/auth/auth.js';
import type { AuthAdapter, AuthState } from '../features/auth/types.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
});

function adapter(
  state: AuthState,
  signOut: () => Promise<void> = () => Promise.resolve(),
  signIn: () => Promise<void> = () => Promise.resolve()
): AuthAdapter {
  return {
    subscribe(listener) {
      listener(state);
      return () => undefined;
    },
    signIn,
    signOut,
    getToken: () => Promise.resolve('test-token')
  };
}

function MissingProviderConsumer(): React.JSX.Element {
  useAuth();
  return <p>unreachable</p>;
}

describe('application frame and auth edge states', () => {
  it('switches themes, shows the signed-in shell, and reports sign-out failure', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    render(
      <App
        authAdapter={adapter({ status: 'signed-in', uid: 'alice', name: 'Amrita' }, () =>
          Promise.reject(new Error('private sign-out detail'))
        )}
      />
    );
    expect(screen.getByText('Amrita')).toBeDefined();
    const theme = screen.getByRole('button', { name: 'Switch to light theme' });
    await userEvent.click(theme);
    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Sign-out did not finish. Please try again.'
    );
  });

  it('renders the recoverable sign-in-unavailable landing state', () => {
    render(<App authAdapter={adapter({ status: 'error' })} />);
    expect(
      screen.getByText('Daymark could not connect to sign-in. Please try again.')
    ).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Continue with Google' }).hasAttribute('disabled')
    ).toBe(true);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDefined();
  });

  it('shows a safe sign-in failure on the public landing page', async () => {
    render(
      <App
        authAdapter={adapter(
          { status: 'signed-out' },
          () => Promise.resolve(),
          () => Promise.reject(new Error('private sign-in detail'))
        )}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Sign-in did not finish. Allow the Google sign-in window and try again.'
    );
  });

  it('requires the authentication provider for protected hooks', () => {
    expect(() => render(<MissingProviderConsumer />)).toThrow('AuthProvider is required.');
  });

  it('handles a missing matchMedia implementation', () => {
    vi.stubGlobal('matchMedia', undefined);
    render(<App authAdapter={adapter({ status: 'signed-out' })} />);
    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeDefined();
  });
});
