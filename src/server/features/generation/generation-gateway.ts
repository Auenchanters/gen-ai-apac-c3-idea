import { AppError } from '../../errors/app-error.js';
import { buildPrompt, type GenerationInput, type JournalPrompt } from './prompt-builder.js';
import { parseModelOutput, type JournalTurnResult } from './output-schema.js';

/** Only these server-selected model IDs may be called. */
export const MODEL_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash'
] as const;
/** Dependency boundary for the official SDK. */
export type ModelTransport = (
  model: string,
  prompt: JournalPrompt,
  signal: AbortSignal
) => Promise<string>;
/** Server-owned reflection gateway. */
export type GenerationGateway = (input: GenerationInput) => Promise<JournalTurnResult>;

function recoverable(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('status' in error)) return false;
  return [429, 503, 404, 500].includes(Number(error.status));
}

async function requestModel(
  transport: ModelTransport,
  prompt: JournalPrompt,
  signal: AbortSignal
): Promise<string> {
  for (const model of MODEL_LADDER) {
    signal.throwIfAborted();
    try {
      return await transport(model, prompt, signal);
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (!recoverable(error)) break;
    }
  }
  throw new AppError(
    503,
    'GENERATION_UNAVAILABLE',
    'Reflections are temporarily unavailable. Your entry has not been saved.'
  );
}

/** Applies one global 45-second deadline and the documented recoverable fallback ladder.
 * @param transport - Official SDK adapter or test-only transport.
 * @returns Validating reflection gateway.
 */
export function createGenerationGateway(transport: ModelTransport): GenerationGateway {
  return async (input) => {
    const controller = new AbortController();
    const prompt = buildPrompt(input);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(
          new AppError(
            504,
            'GENERATION_TIMEOUT',
            'The reflection timed out. Your entry has not been saved.'
          )
        );
      }, 45000);
      timer.unref();
    });
    try {
      const raw = await Promise.race([requestModel(transport, prompt, controller.signal), timeout]);
      return parseModelOutput(raw, prompt.sourceMessageIds);
    } finally {
      clearTimeout(timer);
    }
  };
}
