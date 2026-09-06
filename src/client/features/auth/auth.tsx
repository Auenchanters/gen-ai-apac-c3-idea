import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';

import { ApiClient } from '../../lib/api.js';
import type { AuthAdapter, AuthState } from './types.js';

interface AuthValue {
  state: AuthState;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  api: ApiClient;
}
const AuthContext = createContext<AuthValue | null>(null);

/** Connects federated authentication to private UI state.
 * @param props - Adapter and child tree.
 * @param props.adapter - Session-scoped Firebase adapter.
 * @param props.children - Private and public application content.
 * @returns Authentication context provider.
 */
export function AuthProvider({
  adapter,
  children
}: {
  adapter: AuthAdapter;
  children: ReactNode;
}): React.JSX.Element {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => adapter.subscribe(setState), [adapter]);
  const signIn = useCallback(async () => {
    setError(null);
    try {
      await adapter.signIn();
    } catch {
      setError('Sign-in did not finish. Allow the Google sign-in window and try again.');
    }
  }, [adapter]);
  const signOut = useCallback(async () => {
    setError(null);
    try {
      await adapter.signOut();
    } catch {
      setError('Sign-out did not finish. Please try again.');
    }
  }, [adapter]);
  const api = useMemo(() => new ApiClient(() => adapter.getToken()), [adapter]);
  const value = useMemo(
    () => ({ state, error, signIn, signOut, api }),
    [state, error, signIn, signOut, api]
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}

/** Reads the current authentication boundary.
 * @returns Verified browser authentication state.
 */
export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (value === null) throw new Error('AuthProvider is required.');
  return value;
}
