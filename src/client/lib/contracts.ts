import { z } from 'zod';

/** Public journal metadata. */
export const journalSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  tone: z.enum(['gentle', 'practical', 'curious']),
  summary: z.string(),
  themes: z.array(z.string()),
  nextStep: z.string(),
  messageCount: z.number(),
  version: z.number(),
  createdAt: z.number(),
  updatedAt: z.number()
});
/** Plain-text conversation message. */
export const messageSchema = z.object({
  id: z.uuid(),
  role: z.enum(['user', 'model']),
  text: z.string(),
  sequence: z.number(),
  requestId: z.uuid(),
  createdAt: z.number()
});
/** Inspectable Context Contract item. */
export const memorySchema = z.object({
  id: z.uuid(),
  kind: z.enum(['fact', 'commitment', 'preference', 'question']),
  text: z.string(),
  status: z.enum(['proposed', 'approved', 'rejected', 'retired']),
  sourceMessageIds: z.array(z.uuid()),
  revision: z.number(),
  createdAt: z.number(),
  updatedAt: z.number()
});
/** Complete bounded journal. */
export const detailSchema = z.object({
  journal: journalSchema,
  messages: z.array(messageSchema),
  memories: z.array(memorySchema)
});
/** Cursor-paginated history. */
export const listSchema = z.object({
  journals: z.array(journalSchema),
  nextCursor: z.string().nullable()
});
/** Atomic committed turn. */
export const turnSchema = detailSchema.extend({ requestId: z.uuid(), journalId: z.uuid() });
/** Private deterministic reflection overview. */
export const compassSchema = z.object({
  period: z.enum(['week', 'month']),
  journalCount: z.number(),
  topics: z.array(z.object({ topic: z.string(), count: z.number() })),
  memories: z.array(memorySchema),
  generatedAt: z.string()
});
/** Public journal metadata type. */
export type Journal = z.infer<typeof journalSchema>;
/** Full journal type. */
export type JournalDetail = z.infer<typeof detailSchema>;
/** Context Contract item type. */
export type Memory = z.infer<typeof memorySchema>;
