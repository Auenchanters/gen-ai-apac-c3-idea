import { useState } from 'react';
import { ApiError } from '../../lib/api.js';
import { turnSchema, type JournalDetail, type Memory } from '../../lib/contracts.js';
import { useAuth } from '../auth/auth.js';

/** Local state retains an uncertain request's original idempotency key. */
export interface ConversationState {
  detail: JournalDetail;
  draft: string;
  pending: boolean;
  error: string | null;
  retry: { requestId: string; text: string } | null;
  canRevise: boolean;
  setDraft: (text: string) => void;
  send: () => Promise<void>;
  revise: () => void;
  updateMemories: (memories: Memory[]) => void;
}

/** Coordinates confirmed saves and safe same-request retries.
 * @param initial - Persisted owned journal.
 * @returns Conversation state and explicit actions.
 */
export function useConversation(initial: JournalDetail): ConversationState {
  const { api } = useAuth();
  const [detail, setDetail] = useState(initial);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [retry, setRetry] = useState<ConversationState['retry']>(null);
  const [error, setError] = useState<string | null>(null);
  const [canRevise, setCanRevise] = useState(false);
  async function send(): Promise<void> {
    const payload = retry ?? { requestId: crypto.randomUUID(), text: draft.trim() };
    if (pending || payload.text === '') return;
    setRetry(payload);
    setPending(true);
    setError(null);
    setCanRevise(false);
    try {
      const result = await api.send(
        `/api/journals/${detail.journal.id}/turns`,
        'POST',
        turnSchema,
        payload
      );
      setDetail((current) => mergeTurn(current, result, payload.requestId));
      setDraft('');
      setRetry(null);
    } catch (failure) {
      setError(
        failure instanceof ApiError
          ? failure.message
          : 'Your reflection could not be saved. Please retry.'
      );
      setCanRevise(
        failure instanceof ApiError && ['MODEL_BLOCKED', 'INVALID_INPUT'].includes(failure.code)
      );
    } finally {
      setPending(false);
    }
  }
  return {
    detail,
    draft,
    pending,
    retry,
    error,
    canRevise,
    setDraft,
    send,
    revise: () => {
      if (canRevise) {
        setRetry(null);
        setError(null);
        setCanRevise(false);
      }
    },
    updateMemories: (memories) => {
      setDetail((current) => ({ ...current, memories }));
    }
  };
}

function mergeTurn(
  current: JournalDetail,
  result: JournalDetail,
  requestId: string
): JournalDetail {
  return {
    journal: result.journal,
    messages: [
      ...current.messages.filter((message) => message.requestId !== requestId),
      ...result.messages
    ],
    memories: result.memories
  };
}
