import { Button } from '@radix-ui/themes';
import { useState } from 'react';
import { z } from 'zod';
import { Feedback } from '../../app/feedback.js';
import { memorySchema, type Memory } from '../../lib/contracts.js';
import { useAuth } from '../auth/auth.js';
import { DeleteControl } from '../privacy/delete-control.js';

interface Props {
  readonly item: Memory;
  readonly journalId: string;
  readonly sourceText: string;
  readonly onSave: (item: Memory | null) => void;
}

/** Applies explicit consent actions and keeps source provenance visible.
 * @param props - Owned memory, provenance, and saved-result callback.
 * @returns One inspectable memory with revision-checked controls.
 */
export function MemoryItem(props: Props): React.JSX.Element {
  const state = useMemoryState(props);
  const { editing, error, update } = state;
  return (
    <li className="memory-item">
      <div className="memory-meta">
        <span>{props.item.kind}</span>
        <span>{props.item.status}</span>
      </div>
      <p>{props.item.text}</p>
      <details>
        <summary>Source in your writing</summary>
        <p className="source-text">{props.sourceText}</p>
      </details>
      {error !== null && <Feedback message={error} />}
      {editing ? (
        <MemoryEditor state={state} id={props.item.id} />
      ) : (
        <MemoryActions state={state} status={props.item.status} />
      )}
      <DeleteControl
        label="Delete memory"
        description="This removes the memory, not its source messages. Delete the journal to remove those too."
        onDelete={() => update('delete')}
      />
    </li>
  );
}
interface MemoryState {
  editing: boolean;
  text: string;
  pending: boolean;
  error: string | null;
  update: (action: 'approve' | 'edit' | 'reject' | 'retire' | 'delete') => Promise<void>;
  setEditing: (editing: boolean) => void;
  setText: (text: string) => void;
}
function useMemoryState(props: Props): MemoryState {
  const { api } = useAuth();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(props.item.text);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function update(
    action: 'approve' | 'edit' | 'reject' | 'retire' | 'delete'
  ): Promise<void> {
    setPending(true);
    setError(null);
    try {
      const result = await api.send(
        `/api/journals/${props.journalId}/memories/${props.item.id}`,
        'PATCH',
        z.union([memorySchema, z.object({ deleted: z.literal(true) })]),
        {
          revision: props.item.revision,
          action,
          ...(action === 'edit' ? { text: text.trim() } : {})
        }
      );
      props.onSave('deleted' in result ? null : result);
      setEditing(false);
    } catch (failure) {
      if (action === 'delete') throw failure;
      setError('This memory could not be updated. Reload the journal and try again.');
    } finally {
      setPending(false);
    }
  }

  return { editing, text, pending, error, update, setEditing, setText };
}
function MemoryEditor(props: { state: MemoryState; id: string }): React.JSX.Element {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void props.state.update('edit');
      }}
    >
      <label htmlFor={`memory-${props.id}`}>Memory text</label>
      <textarea
        id={`memory-${props.id}`}
        value={props.state.text}
        onChange={(event) => {
          props.state.setText(event.target.value);
        }}
        maxLength={500}
        disabled={props.state.pending}
        required
      />
      <div className="button-row">
        <Button type="submit" disabled={props.state.pending || props.state.text.trim() === ''}>
          Save memory
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={props.state.pending}
          onClick={() => {
            props.state.setEditing(false);
          }}
        >
          Cancel edit
        </Button>
      </div>
    </form>
  );
}
function MemoryActions(props: { state: MemoryState; status: Memory['status'] }): React.JSX.Element {
  return (
    <div className="button-row">
      {props.status === 'proposed' && (
        <>
          <Button
            disabled={props.state.pending}
            onClick={() => {
              void props.state.update('approve');
            }}
          >
            Approve memory
          </Button>
          <Button
            disabled={props.state.pending}
            variant="ghost"
            onClick={() => {
              void props.state.update('reject');
            }}
          >
            Reject memory
          </Button>
        </>
      )}
      {props.status === 'approved' && (
        <Button
          disabled={props.state.pending}
          variant="soft"
          onClick={() => {
            void props.state.update('retire');
          }}
        >
          Retire memory
        </Button>
      )}
      {(props.status === 'proposed' || props.status === 'approved') && (
        <Button
          disabled={props.state.pending}
          variant="ghost"
          onClick={() => {
            props.state.setEditing(true);
          }}
        >
          Edit memory
        </Button>
      )}
    </div>
  );
}
