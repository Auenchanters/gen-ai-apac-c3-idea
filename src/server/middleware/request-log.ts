import { randomUUID } from 'node:crypto';

import type { RequestHandler } from 'express';
import type { Logger } from 'pino';

/** Logs only allowlisted operational metadata, never URLs, identity, headers or content.
 * @param logger - Structured server logger.
 * @returns Correlation and completion middleware.
 */
export function requestLog(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const requestId = randomUUID();
    const start = performance.now();
    res.locals['requestId'] = requestId;
    res.setHeader('X-Request-ID', requestId);
    res.on('finish', () => {
      logger.info({
        event: 'request_complete',
        requestId,
        method: req.method,
        status: res.statusCode,
        durationMs: Math.round(performance.now() - start)
      });
    });
    next();
  };
}
