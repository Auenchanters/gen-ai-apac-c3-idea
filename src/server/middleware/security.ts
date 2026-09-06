import type { RequestHandler } from 'express';
import helmet from 'helmet';

import type { ServerEnvironment } from '../config/environment.js';

/** Creates an explicit Firebase-popup-compatible content security policy.
 * @param env - Validated runtime environment.
 * @returns Header middleware.
 */
export function securityHeaders(env: ServerEnvironment): RequestHandler {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        fontSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        connectSrc: [
          "'self'",
          'https://identitytoolkit.googleapis.com',
          'https://securetoken.googleapis.com',
          'https://www.googleapis.com',
          `https://${env.publicConfig.authDomain}`
        ],
        frameSrc: [`https://${env.publicConfig.authDomain}`],
        upgradeInsecureRequests: env.mode === 'production' ? [] : null
      }
    },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    strictTransportSecurity:
      env.mode === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
    referrerPolicy: { policy: 'no-referrer' }
  });
}
