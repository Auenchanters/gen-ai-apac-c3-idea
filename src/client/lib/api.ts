import { z } from 'zod';

/** A safe failure shown without leaking an upstream error. */
export class ApiError extends Error {
  /** Constructs an API failure.
   * @param code - Stable error category.
   * @param message - Safe description.
   */
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const messages: Record<string, string> = {
  UNAUTHENTICATED: 'Your session ended. Sign in again.',
  RATE_LIMITED: 'Pause for a moment, then try again.',
  NOT_FOUND: 'This journal is no longer available.',
  INVALID_INPUT: 'Check your entry and try again.',
  TURN_IN_PROGRESS: 'A reflection is already being saved. Wait a moment and retry.',
  REVISION_CONFLICT: 'This memory changed. Refresh it before trying again.',
  GENERATION_UNAVAILABLE: 'Gemini is unavailable right now. Your draft is still here.',
  GENERATION_REFUSED: 'Gemini could not respond to this entry. Your draft is still here.'
};

/** Same-origin transport; the token is held only for a single request. */
export class ApiClient {
  /** Creates a validated browser transport.
   * @param token - Retrieves a current Firebase ID token.
   * @param network - Browser fetch, injectable only at the composition boundary.
   */
  constructor(
    private readonly token: () => Promise<string>,
    private readonly network: typeof fetch = fetch
  ) {}

  /** Reads validated API data.
   * @param path - Same-origin API path.
   * @param schema - Response contract.
   * @returns Validated data.
   */
  get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    return this.send(path, 'GET', schema);
  }

  /** Sends a validated same-origin operation without automatic mutation retries.
   * @param path - Same-origin API path.
   * @param method - HTTP operation.
   * @param schema - Response contract.
   * @param body - Explicit application payload.
   * @returns Validated data after the server confirms persistence.
   */
  async send<T>(
    path: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    schema: z.ZodType<T>,
    body?: unknown
  ): Promise<T> {
    if (!/^\/api\/[A-Za-z0-9/?=&_-]*$/u.test(path))
      throw new ApiError('INVALID_PATH', 'Invalid request path.');
    try {
      const response = await this.network(path, {
        method,
        credentials: 'omit',
        cache: 'no-store',
        signal: AbortSignal.timeout(60_000),
        headers: {
          Authorization: `Bearer ${await this.token()}`,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
      const data: unknown = response.status === 204 ? undefined : await response.json();
      if (!response.ok) {
        const error = z.object({ error: z.object({ code: z.string() }) }).safeParse(data);
        const code = error.success ? error.data.error.code : 'REQUEST_FAILED';
        throw new ApiError(code, messages[code] ?? 'The request could not be completed.');
      }
      return schema.parse(data);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('REQUEST_FAILED', 'The request could not be completed.');
    }
  }
}
