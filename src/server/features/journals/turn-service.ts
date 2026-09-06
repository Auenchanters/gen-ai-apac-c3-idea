import type { GenerationGateway } from '../generation/generation-gateway.js';
import { parseModelOutput } from '../generation/output-schema.js';
import { buildPrompt } from '../generation/prompt-builder.js';
import { turnRequestSchema, type CommittedTurn } from './contracts.js';
import type { JournalRepository } from './journal-repository.js';
import { validateScope } from './repository-guards.js';
import { commitTurn } from './turn-commit.js';
import { reserveTurn } from './turn-reservation.js';

/** Coordinates reservation, external generation, and atomic persistence. */
export class TurnService {
  /** Creates the orchestration service with real or test-only dependencies.
   * @param repository - Owned transactional persistence.
   * @param gateway - Server-only generation gateway.
   */
  constructor(
    private readonly repository: JournalRepository,
    private readonly gateway: GenerationGateway
  ) {}

  /** Submits one idempotent turn; dependency errors never produce half-saved messages.
   * @param uid - Verified identity.
   * @param journalId - Opaque owned journal ID.
   * @param input - Strict user text and request ID.
   * @returns Confirmed saved turn or the prior matching response.
   */
  async submitTurn(uid: string, journalId: string, input: unknown): Promise<CommittedTurn> {
    validateScope(uid, journalId);
    const request = turnRequestSchema.parse(input);
    const result = await this.repository.store.transact(uid, journalId, (state) =>
      reserveTurn(state, request)
    );
    if ('completed' in result) return result.completed;
    const { reservation } = result;
    try {
      const generated = await this.gateway(reservation.input);
      const output = parseModelOutput(
        JSON.stringify(generated),
        buildPrompt(reservation.input).sourceMessageIds
      );
      return await this.repository.store.transact(uid, journalId, (state) =>
        commitTurn(state, reservation, output)
      );
    } catch (error) {
      await this.repository.store
        .transact(uid, journalId, (state) => {
          if (state.journal?.lease?.token === reservation.token) state.journal.lease = null;
        })
        .catch(() => undefined);
      throw error;
    }
  }
}
