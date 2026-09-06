import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';

import { AppError } from '../errors/app-error.js';

/** Per-instance fuse; distributed generation reservations live in the turn repository.
 * @param limit - Maximum requests per minute.
 * @param byUser - Whether verified identity is already available.
 * @returns Burst-limiting middleware.
 */
export function burstLimit(limit: number, byUser: boolean): RequestHandler {
  return rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    ...(byUser
      ? {
          keyGenerator: (_req, res) =>
            z
              .string()
              .min(1)
              .parse(res.locals['uid'] as unknown)
        }
      : {}),
    handler: () => {
      throw new AppError(429, 'RATE_LIMITED', 'Pause for a moment, then try again.');
    }
  });
}
