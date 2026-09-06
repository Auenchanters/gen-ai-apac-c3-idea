import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const firebaseMocks = vi.hoisted(() => {
  class GoogleAuthProviderMock {
    readonly setCustomParameters = vi.fn();
  }
  return {
    initializeApp: vi.fn(() => ({ name: 'daymark' })),
    getAuth: vi.fn(),
    browserSessionPersistence: 'session',
    GoogleAuthProvider: GoogleAuthProviderMock,
    onAuthStateChanged: vi.fn(),
    setPersistence: vi.fn(),
    signInWithPopup: vi.fn(),
    signOut: vi.fn()
  };
});

vi.mock('firebase/app', () => ({ initializeApp: firebaseMocks.initializeApp }));
vi.mock('firebase/auth', () => firebaseMocks);

import { createFirebaseAuth } from './firebase-auth.js';

interface FakeUser {
  readonly uid: string;
  readonly displayName: string | null;
  readonly getIdToken: () => Promise<string>;
}

const config = {
  apiKey: 'public-key',
  authDomain: 'daymark-test.firebaseapp.com',
  projectId: 'daymark-test',
  appId: 'app-id'
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

beforeEach(() => {
  firebaseMocks.getAuth.mockReturnValue({ currentUser: null });
  firebaseMocks.setPersistence.mockResolvedValue(undefined);
  firebaseMocks.signInWithPopup.mockResolvedValue(undefined);
  firebaseMocks.signOut.mockResolvedValue(undefined);
});

function successfulConfig(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify(config), { status: 200 }))
  );
}

describe('Firebase browser adapter', () => {
  it('initializes once, maps signed-out and signed-in users, and cleans up', async () => {
    successfulConfig();
    let onChange: ((user: FakeUser | null) => void) | undefined;
    const unsubscribe = vi.fn();
    firebaseMocks.onAuthStateChanged.mockImplementation(
      (_auth: unknown, callback: (user: FakeUser | null) => void) => {
        onChange = callback;
        callback(null);
        return unsubscribe;
      }
    );
    const adapter = createFirebaseAuth();
    const listener = vi.fn();
    const stop = adapter.subscribe(listener);
    await vi.waitFor(() => {
      expect(firebaseMocks.onAuthStateChanged).toHaveBeenCalledTimes(1);
    });
    expect(listener).toHaveBeenLastCalledWith({ status: 'signed-out' });
    onChange?.({
      uid: 'alice',
      displayName: 'Ada Lovelace',
      getIdToken: () => Promise.resolve('token')
    });
    expect(listener).toHaveBeenLastCalledWith({ status: 'signed-in', uid: 'alice', name: 'Ada' });
    stop();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(firebaseMocks.initializeApp).toHaveBeenCalledWith(config);
    expect(firebaseMocks.setPersistence).toHaveBeenCalledWith(
      expect.anything(),
      firebaseMocks.browserSessionPersistence
    );
  });

  it('uses a fallback name when the provider omits displayName', async () => {
    successfulConfig();
    let onChange: ((user: FakeUser | null) => void) | undefined;
    firebaseMocks.onAuthStateChanged.mockImplementation(
      (_auth: unknown, callback: (user: FakeUser | null) => void) => {
        onChange = callback;
        return vi.fn();
      }
    );
    const listener = vi.fn();
    createFirebaseAuth().subscribe(listener);
    await vi.waitFor(() => {
      expect(onChange).toBeDefined();
    });
    onChange?.({ uid: 'alice', displayName: null, getIdToken: () => Promise.resolve('token') });
    expect(listener).toHaveBeenLastCalledWith({
      status: 'signed-in',
      uid: 'alice',
      name: 'Your journal'
    });
  });
});

describe('Firebase adapter failures and shared auth', () => {
  it('uses the shared initialized auth for sign in, sign out, and token retrieval', async () => {
    successfulConfig();
    const getIdToken = vi.fn().mockResolvedValue('fresh-token');
    const auth = { currentUser: { getIdToken } };
    firebaseMocks.getAuth.mockReturnValue(auth);
    const adapter = createFirebaseAuth();
    await adapter.signIn();
    await adapter.signOut();
    await expect(adapter.getToken()).resolves.toBe('fresh-token');
    expect(firebaseMocks.signInWithPopup).toHaveBeenCalledWith(auth, expect.anything());
    expect(firebaseMocks.signOut).toHaveBeenCalledWith(auth);
    expect(firebaseMocks.getAuth).toHaveBeenCalledTimes(1);
    expect(getIdToken).toHaveBeenCalledTimes(1);
  });

  it('reports configuration and auth listener failures without leaking details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('upstream', { status: 503 })));
    const failed = createFirebaseAuth();
    const failureListener = vi.fn();
    failed.subscribe(failureListener);
    await vi.waitFor(() => {
      expect(failureListener).toHaveBeenCalledWith({ status: 'error' });
    });

    successfulConfig();
    firebaseMocks.onAuthStateChanged.mockImplementation(
      (_auth: unknown, _callback: (user: FakeUser | null) => void, onError: () => void) => {
        onError();
        return vi.fn();
      }
    );
    const authError = createFirebaseAuth();
    const listener = vi.fn();
    authError.subscribe(listener);
    await vi.waitFor(() => {
      expect(listener).toHaveBeenCalledWith({ status: 'error' });
    });
  });

  it('does not attach a listener after an early unsubscribe and rejects missing users', async () => {
    let resolveConfig: (response: Response) => void = () => undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveConfig = resolve;
          })
      )
    );
    const adapter = createFirebaseAuth();
    const listener = vi.fn();
    const stop = adapter.subscribe(listener);
    stop();
    resolveConfig(new Response(JSON.stringify(config), { status: 200 }));
    await Promise.resolve();
    await Promise.resolve();
    expect(firebaseMocks.onAuthStateChanged).not.toHaveBeenCalled();

    let rejectConfig: (reason?: unknown) => void = () => undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((_resolve, reject) => {
            rejectConfig = reject;
          })
      )
    );
    const abandoned = createFirebaseAuth();
    const abandonedListener = vi.fn();
    const stopAbandoned = abandoned.subscribe(abandonedListener);
    stopAbandoned();
    rejectConfig(new Error('private configuration detail'));
    await Promise.resolve();
    await Promise.resolve();
    expect(abandonedListener).not.toHaveBeenCalled();

    successfulConfig();
    firebaseMocks.getAuth.mockReturnValue({ currentUser: null });
    await expect(createFirebaseAuth().getToken()).rejects.toThrow('Sign in required');
  });
});
