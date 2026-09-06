import { z } from 'zod';
import { AppError, notFound } from '../../errors/app-error.js';
import { idSchema, plainText, type MemoryItem } from '../journals/contracts.js';
import type { JournalRepository } from '../journals/journal-repository.js';
import { conflict, requireJournal, validateScope } from '../journals/repository-guards.js';

/** Explicit user actions and optimistic revisions; model fields cannot change state. */
export const memoryUpdateSchema = z.discriminatedUnion('action', [
  z.strictObject({
    action: z.literal('edit'),
    revision: z.number().int().nonnegative(),
    text: plainText(500)
  }),
  z.strictObject({
    action: z.enum(['approve', 'reject', 'retire', 'delete']),
    revision: z.number().int().nonnegative()
  })
]);
/** Memory mutation response; deletion returns only confirmation. */
export type MemoryUpdateResult = MemoryItem | { deleted: true };

function nextStatus(
  memory: MemoryItem,
  action: 'approve' | 'reject' | 'retire' | 'edit'
): MemoryItem['status'] {
  if (action === 'approve' && memory.status === 'proposed') return 'approved';
  if (action === 'reject' && memory.status === 'proposed') return 'rejected';
  if (action === 'retire' && memory.status === 'approved') return 'retired';
  if (action === 'edit' && (memory.status === 'proposed' || memory.status === 'approved'))
    return memory.status;
  throw new AppError(
    409,
    'INVALID_TRANSITION',
    'This memory action is unavailable in its current state.'
  );
}

/** Applies one explicit, provenance-preserving Context Contract action.
 * @param repository - Owned transactional persistence.
 * @param uid - Verified identity.
 * @param ids - Opaque journal and memory identifiers.
 * @param ids.journalId - Opaque owned journal identifier.
 * @param ids.memoryId - Opaque Context Contract item identifier.
 * @param input - Strict action, revision, and optional edit text.
 * @returns Updated memory or deletion confirmation.
 */
export async function updateMemory(
  repository: JournalRepository,
  uid: string,
  ids: { journalId: string; memoryId: string },
  input: unknown
): Promise<MemoryUpdateResult> {
  validateScope(uid, ids.journalId);
  idSchema.parse(ids.memoryId);
  const update = memoryUpdateSchema.parse(input);
  return repository.store.transact(uid, ids.journalId, (state) => {
    const journal = requireJournal(state);
    const memory = state.memories.find((item) => item.id === ids.memoryId);
    if (memory === undefined) throw notFound();
    if (memory.revision !== update.revision) throw conflict();
    if (update.action === 'delete') {
      state.memories = state.memories.filter((item) => item.id !== memory.id);
    } else {
      const sourceIds = new Set(
        state.messages.filter((message) => message.role === 'user').map((message) => message.id)
      );
      if (memory.sourceMessageIds.some((id) => !sourceIds.has(id))) throw conflict();
      memory.status = nextStatus(memory, update.action);
      if (update.action === 'edit') memory.text = update.text;
      memory.revision++;
      memory.updatedAt = Date.now();
    }
    journal.version++;
    journal.updatedAt = Date.now();
    return update.action === 'delete' ? { deleted: true } : memory;
  });
}
