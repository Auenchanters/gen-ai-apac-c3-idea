import type { RequestHandler } from 'express';
import { z } from 'zod';

import { AppError } from '../errors/app-error.js';

/** The one trusted identity passed to data services. */
export interface AuthenticatedUser {
  readonly uid: string;
}
/** Adapter that verifies signature, audience, expiry, revocation and disabled-user state. */
export type TokenVerifier = (token: string) => Promise<unknown>;
const userSchema = z.object({
  uid: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z0-9_-]+$/u)
});

/** Validates a bearer token and extracts only the verified UID.
 * @param header - Raw authorization header.
 * @param verify - Trusted Firebase verification adapter.
 * @returns Verified identity without unneeded account fields.
 */
export async function authenticateRequest(
  header: string | undefined,
  verify: TokenVerifier
): Promise<AuthenticatedUser> {
  const match = header?.match(/^Bearer ([A-Za-z0-9._~-]{1,8192})$/u);
  if (match?.[1] === undefined) throw new AppError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  try {
    return userSchema.parse(await verify(match[1]));
  } catch {
    throw new AppError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  }
}

/** Installs verified identity before any protected handler.
 * @param verify - Trusted Firebase verification adapter.
 * @returns Express authentication middleware.
 */
export function authentication(verify: TokenVerifier): RequestHandler {
  return async (req, res, next) => {
    const user = await authenticateRequest(req.get('Authorization'), verify);
    res.locals['uid'] = user.uid;
    next();
  };
}
