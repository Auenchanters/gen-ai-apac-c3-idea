import type { Server } from 'node:http';

import type { Express } from 'express';

/** Opens an HTTP listener on the Cloud Run-required network interface.
 * @param app - Initialized application.
 * @param port - Validated port; zero requests an ephemeral local test port.
 * @returns Listening server.
 */
export function listen(app: Express, port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, '0.0.0.0', (error: Error | undefined) => {
      if (error !== undefined) reject(error);
      else resolve(server);
    });
  });
}

/** Drains active requests with a deadline below Cloud Run's termination grace period.
 * @param server - Active HTTP server.
 * @param cleanup - Dependency cleanup after requests finish.
 * @returns Completion of drain and cleanup.
 */
export async function drainServer(server: Server, cleanup: () => Promise<void>): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const deadline = setTimeout(() => {
      server.closeAllConnections();
    }, 8000);
    deadline.unref();
    server.close((error) => {
      clearTimeout(deadline);
      if (error !== undefined) reject(error);
      else resolve();
    });
  });
  await cleanup();
}
