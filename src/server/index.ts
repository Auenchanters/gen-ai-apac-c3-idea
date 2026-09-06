import { resolve } from 'node:path';
import { deleteApp } from 'firebase-admin/app';
import pino from 'pino';
import { createApplication } from './app.js';
import { loadEnvironment } from './config/environment.js';
import { createGeminiGateway } from './features/generation/gemini-gateway.js';
import { createFirestoreStore } from './features/journals/firestore-store.js';
import { JournalRepository } from './features/journals/journal-repository.js';
import { createJournalRouter } from './features/journals/journal-router.js';
import { TurnService } from './features/journals/turn-service.js';
import { createFirebaseServices } from './infrastructure/firebase.js';
import { drainServer, listen } from './infrastructure/server-lifecycle.js';

// The entrypoint alone constructs real cloud adapters; no test or demo auth path exists.
async function start(): Promise<void> {
  const environment = loadEnvironment(process.env);
  const logger = pino({ level: environment.logLevel });
  const firebase = createFirebaseServices(environment.projectId);
  const repository = new JournalRepository(createFirestoreStore(firebase.firestore));
  const turnService = new TurnService(repository, createGeminiGateway(environment.geminiKey));
  let ready = true;
  const app = createApplication({
    environment,
    logger,
    verifyToken: firebase.verifyToken,
    ready: () => ready,
    privateRouter: createJournalRouter({ repository, turnService }),
    staticDirectory: resolve('dist/client')
  });
  const server = await listen(app, environment.port);
  logger.info({ event: 'server_listening' });
  async function shutdown(): Promise<void> {
    if (!ready) return;
    ready = false;
    try {
      await drainServer(server, async () => {
        await firebase.firestore.terminate();
        await deleteApp(firebase.app);
      });
      logger.info({ event: 'server_stopped' });
    } catch {
      logger.error({ event: 'shutdown_failed' });
      process.exitCode = 1;
    }
  }
  process.once('SIGTERM', () => {
    void shutdown();
  });
  process.once('SIGINT', () => {
    void shutdown();
  });
}

void start().catch(() => {
  pino().fatal({ event: 'startup_failed' });
  process.exitCode = 1;
});
