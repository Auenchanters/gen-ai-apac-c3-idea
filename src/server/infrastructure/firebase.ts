import { applicationDefault, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

import type { TokenVerifier } from '../middleware/authentication.js';

/** Cloud adapters using only the attached runtime identity. */
export interface FirebaseServices {
  readonly app: App;
  readonly auth: Auth;
  readonly firestore: Firestore;
  readonly verifyToken: TokenVerifier;
}

/** Initializes a single project-bound Admin application using ADC.
 * @param projectId - Validated Google project.
 * @returns Runtime Firebase adapters; initialization performs no data operation.
 */
export function createFirebaseServices(projectId: string): FirebaseServices {
  const app =
    getApps().find((candidate) => candidate.name === '[DEFAULT]') ??
    initializeApp({ projectId, credential: applicationDefault() });
  if (app.options.projectId !== projectId) throw new Error('Firebase project mismatch');
  const auth = getAuth(app);
  return {
    app,
    auth,
    firestore: getFirestore(app),
    verifyToken: (token) => auth.verifyIdToken(token, true)
  };
}
