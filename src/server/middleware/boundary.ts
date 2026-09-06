import type { RequestHandler } from 'express';

import { AppError } from '../errors/app-error.js';

/** Enforces same-origin mutation requests and plain JSON bodies.
 * @param origin - Validated canonical application origin.
 * @returns Request boundary middleware.
 */
export function requestBoundary(origin: string): RequestHandler {
  return (req, _res, next) => {
    const unsafe = !['GET', 'HEAD'].includes(req.method);
    if (unsafe && req.get('Origin') !== origin)
      throw new AppError(403, 'ORIGIN_REJECTED', 'Open Daymark to perform this action.');
    if (
      ['POST', 'PUT', 'PATCH'].includes(req.method) &&
      req.is('application/json') !== 'application/json'
    )
      throw new AppError(415, 'JSON_REQUIRED', 'Send a JSON request.');
    next();
  };
}

/**
 * Rejects excess JSON depth and node count before authentication and route parsing.
 * @param req - Parsed request with unknown body.
 * @param _res - Unused response.
 * @param next - Next validated middleware.
 */
export const boundedBody: RequestHandler = (req, _res, next) => {
  const stack: { value: unknown; depth: number }[] = [{ value: req.body as unknown, depth: 0 }];
  let nodes = 0;
  while (stack.length > 0) {
    const item = stack.pop();
    if (item === undefined) break;
    nodes++;
    if (item.depth > 8 || nodes > 1000)
      throw new AppError(400, 'INVALID_INPUT', 'This request is too complex.');
    if (typeof item.value === 'object' && item.value !== null) {
      for (const value of Object.values(item.value)) stack.push({ value, depth: item.depth + 1 });
    }
  }
  next();
};
