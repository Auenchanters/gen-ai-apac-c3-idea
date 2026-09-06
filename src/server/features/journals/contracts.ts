import { z } from 'zod';

/** Fixed storage ceilings keep reads, exports, and transactions bounded. */
export const LIMITS = {
  journals: 50,
  messages: 200,
  memories: 60,
  turns: 100,
  dailyTurns: 100
} as const;
/** Validates a verified Firebase UID before deriving any path. */
export const uidSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/u);
/** Resource identifiers are opaque UUIDs, never document paths. */
export const idSchema = z.uuid();

/** Removes markup, angle delimiters, and nonprinting control characters.
 * @param value - Untrusted text.
 * @returns Plain text suitable for storage and React text rendering.
 */
export function sanitizeText(value: string): string {
  return value
    .replace(/<[^>]*>/gu, '')
    .replace(/[<>]/gu, '')
    .replace(/[\p{Cc}\p{Cf}]/gu, (character) =>
      character === '\n' || character === '\t' ? character : ''
    )
    .trim();
}

/** Builds a bounded nonempty plain-text validator.
 * @param max - Maximum input and persisted length.
 * @returns Plain-text schema.
 */
export function plainText(max: number): z.ZodPipe<z.ZodString, z.ZodTransform<string, string>> {
  return z
    .string()
    .min(1)
    .max(max)
    .transform(sanitizeText)
    .refine((value) => value.length > 0);
}

/** Allowed reflection tones. */
export const toneSchema = z.enum(['gentle', 'practical', 'curious']);
/** Strict creation payload excludes identity and model controls. */
export const createJournalSchema = z.strictObject({
  title: plainText(120),
  tone: toneSchema.default('gentle')
});
/** Strict generation payload. */
export const turnRequestSchema = z.strictObject({ requestId: idSchema, text: plainText(8000) });
/** Bounded journal listing query. */
export const listQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: idSchema.optional()
});
/** Persisted journal metadata, with server-owned timestamps and lease. */
export const journalSchema = z.strictObject({
  id: idSchema,
  title: plainText(120),
  tone: toneSchema,
  summary: z.string().max(2000),
  themes: z.array(plainText(60)).max(8),
  nextStep: z.string().max(500),
  messageCount: z.number().int().min(0).max(LIMITS.messages),
  version: z.number().int().min(0),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  deleted: z.boolean(),
  lease: z
    .strictObject({ requestId: idSchema, token: idSchema, expiresAt: z.number().int() })
    .nullable()
});
/** Persisted message with stable ordering and request provenance. */
export const messageSchema = z.strictObject({
  id: idSchema,
  role: z.enum(['user', 'model']),
  text: plainText(8000),
  sequence: z.number().int().min(0),
  requestId: idSchema,
  createdAt: z.number().int()
});
/** Consent-controlled memory with original user-message references. */
export const memorySchema = z.strictObject({
  id: idSchema,
  kind: z.enum(['fact', 'commitment', 'preference', 'question']),
  text: plainText(500),
  status: z.enum(['proposed', 'approved', 'rejected', 'retired']),
  sourceMessageIds: z.array(idSchema).min(1).max(5),
  revision: z.number().int().min(0),
  createdAt: z.number().int(),
  updatedAt: z.number().int()
});
/** Idempotent request metadata; content hashes never leave the repository. */
export const turnRecordSchema = z.strictObject({
  id: idSchema,
  hash: z.string(),
  status: z.enum(['pending', 'complete']),
  userMessageId: idSchema,
  modelMessageId: idSchema,
  version: z.number().int()
});
/** User coordination document serializes quotas and recursive deletion. */
export const userStateSchema = z.strictObject({
  deleting: z.boolean(),
  journalCount: z.number().int().min(0).max(LIMITS.journals),
  quotaDay: z.string(),
  quotaCount: z.number().int().min(0)
});

/** Journal metadata returned to the browser. */
export type Journal = z.infer<typeof journalSchema>;
/** One saved conversation message. */
export type JournalMessage = z.infer<typeof messageSchema>;
/** One explicit Context Contract item. */
export type MemoryItem = z.infer<typeof memorySchema>;
/** Idempotency record used only inside storage. */
export type TurnRecord = z.infer<typeof turnRecordSchema>;
/** User storage coordination metadata. */
export type UserState = z.infer<typeof userStateSchema>;
/** Strict turn submission. */
export type TurnRequest = z.infer<typeof turnRequestSchema>;
/** Bounded conversation and inspectable memory. */
export interface JournalDetail {
  readonly journal: Journal;
  readonly messages: JournalMessage[];
  readonly memories: MemoryItem[];
}
/** Transaction snapshot; mutable only inside a store transaction. */
export interface JournalState {
  user: UserState;
  journal: Journal | null;
  messages: JournalMessage[];
  memories: MemoryItem[];
  turns: TurnRecord[];
}
/** Complete confirmed response safe to return after commit. */
export interface CommittedTurn {
  readonly requestId: string;
  readonly journalId: string;
  readonly userMessage: JournalMessage;
  readonly modelMessage: JournalMessage;
  readonly journal: Journal;
  readonly memories: MemoryItem[];
}
