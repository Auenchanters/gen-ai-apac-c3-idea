import { z } from 'zod';
import { AppError } from '../../errors/app-error.js';
import { idSchema, plainText } from '../journals/contracts.js';

/** Every model field is allowlisted, bounded, and sanitized before use. */
export const modelOutputSchema = z.strictObject({
  reply: plainText(8000),
  summary: plainText(2000),
  themes: z.array(plainText(60)).max(8),
  nextStep: plainText(500),
  proposals: z
    .array(
      z.strictObject({
        kind: z.enum(['fact', 'commitment', 'preference', 'question']),
        text: plainText(500),
        sourceMessageIds: z.array(idSchema).min(1).max(5)
      })
    )
    .max(3)
});

/** Validated plain-text generation result. */
export type JournalTurnResult = z.infer<typeof modelOutputSchema>;

/** Parses structured output and verifies every proposed source is a supplied USER message.
 * @param raw - Untrusted model JSON.
 * @param sourceIds - User message IDs actually included in the prompt.
 * @returns Validated and sanitized result.
 */
export function parseModelOutput(raw: string, sourceIds: readonly string[]): JournalTurnResult {
  try {
    if (raw.length > 20000) throw new Error('Output ceiling');
    const value = modelOutputSchema.parse(JSON.parse(raw));
    if (
      value.proposals.some((proposal) =>
        proposal.sourceMessageIds.some((id) => !sourceIds.includes(id))
      )
    )
      throw new Error('Invalid provenance');
    return value;
  } catch {
    throw new AppError(
      502,
      'INVALID_MODEL_OUTPUT',
      'The reflection could not be validated. Your entry has not been saved.'
    );
  }
}
