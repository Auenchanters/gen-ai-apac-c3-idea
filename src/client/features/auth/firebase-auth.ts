import { initializeApp } from 'firebase/app';
import {
  browserSessionPersistence,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
  type Auth
} from 'firebase/auth';
import { z } from 'zod';

import type { AuthAdapter } from './types.js';

const publicConfig = z.object({
  apiKey: z.string().min(1),
  authDomain: z.string().min(1),
  projectId: z.string().min(1),
  appId: z.string().min(1)
});

async function initialize(): Promise<Auth> {
  const response = await fetch('/api/config', {
    cache: 'no-store',
    credentials: 'omit',
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) throw new Error('Configuration unavailable');
  const data: unknown = await response.json();
  const auth = getAuth(initializeApp(publicConfig.parse(data)));
  await setPersistence(auth, browserSessionPersistence);
  return auth;
}

/** Creates the production Firebase adapter with session-scoped SDK persistence.
 * @returns Federated authentication adapter.
 */
export function createFirebaseAuth(): AuthAdapter {
  let initialized: Promise<Auth> | undefined;
  const ready = (): Promise<Auth> => {
    initialized ??= initialize();
    return initialized;
  };
  return {
    subscribe(listener) {
      let active = true;
      let unsubscribe: (() => void) | undefined;
      void ready()
        .then((auth) => {
          if (!active) return;
          unsubscribe = onAuthStateChanged(
            auth,
            (user) => {
              listener(
                user === null
                  ? { status: 'signed-out' }
                  : {
                      status: 'signed-in',
                      uid: user.uid,
                      name: user.displayName?.split(' ')[0] ?? 'Your journal'
                    }
              );
            },
            () => {
              listener({ status: 'error' });
            }
          );
        })
        .catch(() => {
          if (active) listener({ status: 'error' });
        });
      return () => {
        active = false;
        unsubscribe?.();
      };
    },
    async signIn() {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(await ready(), provider);
    },
    async signOut() {
      await signOut(await ready());
    },
    async getToken() {
      const auth = await ready();
      if (auth.currentUser === null) throw new Error('Sign in required');
      return auth.currentUser.getIdToken();
    }
  };
}
