/** Authentication state contains no token or unnecessary account attributes. */
export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'error' }
  | { status: 'signed-in'; uid: string; name: string };
/** Federated sign-in adapter. Test implementations never enter the production entrypoint. */
export interface AuthAdapter {
  subscribe: (listener: (state: AuthState) => void) => () => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string>;
}
