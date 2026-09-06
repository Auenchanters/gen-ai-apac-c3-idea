import { extname, resolve } from 'node:path';

import compression from 'compression';
import express, { type Express, type Router } from 'express';
import type { Logger } from 'pino';

import type { ServerEnvironment } from './config/environment.js';
import { notFound } from './errors/app-error.js';
import { authentication, type TokenVerifier } from './middleware/authentication.js';
import { boundedBody, requestBoundary } from './middleware/boundary.js';
import { errorHandler } from './middleware/errors.js';
import { burstLimit } from './middleware/rate-limit.js';
import { requestLog } from './middleware/request-log.js';
import { securityHeaders } from './middleware/security.js';

/** External adapters and initialized state supplied by the process entrypoint. */
export interface ApplicationDependencies {
  readonly environment: ServerEnvironment;
  readonly verifyToken: TokenVerifier;
  readonly logger: Logger;
  readonly ready: () => boolean;
  readonly privateRouter?: Router;
  readonly staticDirectory?: string;
  readonly uidLimit?: number;
}

function mountStatic(app: Express, directory: string): void {
  const root = resolve(directory);
  app.use((req, _res, next) => {
    try {
      if (
        decodeURIComponent(req.path)
          .split('/')
          .some((part) => part.startsWith('.'))
      ) {
        next(notFound());
        return;
      }
    } catch {
      next(notFound());
      return;
    }
    next();
  });
  app.use(express.static(root, { index: false, dotfiles: 'deny', maxAge: 0 }));
  app.get('/{*splat}', (req, res, next) => {
    if (
      extname(req.path) !== '' ||
      req.path.startsWith('/assets/') ||
      req.accepts('html') === false
    ) {
      next(notFound());
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(resolve(root, 'index.html'));
  });
}

/** Creates the same-origin application without opening ports or contacting cloud services.
 * @param dependencies - Validated settings and external adapters.
 * @returns Configured Express application.
 */
export function createApplication(dependencies: ApplicationDependencies): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', false);
  app.use(
    requestLog(dependencies.logger),
    securityHeaders(dependencies.environment),
    compression()
  );
  app.use((_req, res, next) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
    );
    next();
  });
  app.get('/healthz', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ status: 'ok' });
  });
  app.get('/readyz', (_req, res) => {
    const ready = dependencies.ready();
    res.setHeader('Cache-Control', 'no-store');
    res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready' });
  });
  app.get('/.well-known/security.txt', (_req, res) => {
    res
      .type('text/plain')
      .send(
        'Contact: https://github.com/Auenchanters/gen-ai-apac-c3-idea/security/advisories/new\nExpires: 2027-09-05T00:00:00Z\nPreferred-Languages: en\n'
      );
  });
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.get('/api/config', (_req, res) => {
    res.json(dependencies.environment.publicConfig);
  });
  app.use(
    '/api',
    burstLimit(600, false),
    requestBoundary(dependencies.environment.origin),
    express.json({ limit: '32kb', strict: true, inflate: false }),
    boundedBody,
    authentication(dependencies.verifyToken),
    burstLimit(dependencies.uidLimit ?? 120, true)
  );
  if (dependencies.privateRouter !== undefined) app.use('/api', dependencies.privateRouter);
  app.use('/api', () => {
    throw notFound();
  });
  if (dependencies.staticDirectory !== undefined) mountStatic(app, dependencies.staticDirectory);
  app.use(() => {
    throw notFound();
  });
  app.use(errorHandler);
  return app;
}
