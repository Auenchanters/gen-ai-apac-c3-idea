import type { ErrorRequestHandler } from 'express';
import { z } from 'zod';

import { AppError } from '../errors/app-error.js';

const parserError = z.object({
  type: z.enum(['entity.too.large', 'entity.parse.failed', 'encoding.unsupported'])
});

function safeError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof z.ZodError)
    return new AppError(400, 'INVALID_INPUT', 'Check the supplied fields.');
  const parsed = parserError.safeParse(error);
  if (parsed.success) {
    if (parsed.data.type === 'entity.too.large')
      return new AppError(413, 'BODY_TOO_LARGE', 'This request is too large.');
    if (parsed.data.type === 'encoding.unsupported')
      return new AppError(415, 'ENCODING_UNSUPPORTED', 'Compressed requests are not accepted.');
    return new AppError(400, 'INVALID_JSON', 'Send valid JSON.');
  }
  return new AppError(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
}

/**
 * Maps failures to a stable safe envelope, never upstream messages or stacks.
 * @param error - Untrusted failure.
 * @param _req - Unused request.
 * @param res - Safe response destination.
 * @param next - Delegates after headers are sent.
 */
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  const failure = safeError(error);
  res.locals['errorCode'] = failure.code;
  res.status(failure.status).json({
    error: {
      code: failure.code,
      message: failure.message,
      requestId: res.locals['requestId'] as unknown
    }
  });
};
