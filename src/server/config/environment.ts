import { z } from 'zod';

const configuration = z.object({
  NODE_ENV: z.enum(['production', 'development', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  APP_ORIGIN: z.url().refine((value) => {
    const url = new URL(value);
    return url.origin === value;
  }),
  FIREBASE_PROJECT_ID: z.string().regex(/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/u),
  FIREBASE_WEB_API_KEY: z.string().min(1).max(200),
  FIREBASE_AUTH_DOMAIN: z.string().regex(/^[a-z0-9-]+\.firebaseapp\.com$/u),
  FIREBASE_APP_ID: z.string().min(1).max(200),
  GEMINI_API_KEY: z.string().min(1).max(500),
  LOG_LEVEL: z.enum(['silent', 'fatal', 'error', 'warn', 'info']).default('info')
});

/** Public Firebase identifiers, never a Gemini credential. */
export interface PublicConfig {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly appId: string;
}
/** Validated runtime settings; only publicConfig may cross into the browser. */
export interface ServerEnvironment {
  readonly mode: 'production' | 'development' | 'test';
  readonly port: number;
  readonly origin: string;
  readonly projectId: string;
  readonly geminiKey: string;
  readonly logLevel: 'silent' | 'fatal' | 'error' | 'warn' | 'info';
  readonly publicConfig: PublicConfig;
}

/** Validates startup settings without echoing rejected values.
 * @param source - Environment-like values.
 * @returns Frozen, explicitly separated runtime settings.
 */
export function loadEnvironment(source: Record<string, unknown>): ServerEnvironment {
  const result = configuration.safeParse(source);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path[0]))].join(', ');
    throw new Error(`Invalid server configuration: ${fields}`);
  }
  const value = result.data;
  const url = new URL(value.APP_ORIGIN);
  const localHttp =
    value.NODE_ENV !== 'production' &&
    url.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !localHttp)
    throw new Error('Invalid server configuration: APP_ORIGIN');
  if (value.FIREBASE_AUTH_DOMAIN !== `${value.FIREBASE_PROJECT_ID}.firebaseapp.com`)
    throw new Error('Invalid server configuration: FIREBASE_AUTH_DOMAIN');
  return Object.freeze({
    mode: value.NODE_ENV,
    port: value.PORT,
    origin: value.APP_ORIGIN,
    projectId: value.FIREBASE_PROJECT_ID,
    geminiKey: value.GEMINI_API_KEY,
    logLevel: value.LOG_LEVEL,
    publicConfig: Object.freeze({
      apiKey: value.FIREBASE_WEB_API_KEY,
      authDomain: value.FIREBASE_AUTH_DOMAIN,
      projectId: value.FIREBASE_PROJECT_ID,
      appId: value.FIREBASE_APP_ID
    })
  });
}
