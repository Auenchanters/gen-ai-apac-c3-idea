import { Button } from '@radix-ui/themes';
import { useId, useState } from 'react';
import { Feedback } from '../../app/feedback.js';

interface Props {
  readonly label: string;
  readonly description: string;
  readonly onDelete: () => Promise<void>;
}

/** Requires deliberate typed confirmation for an irreversible data operation.
 * @param props - Action label, consequences, and asynchronous deletion.
 * @returns Accessible inline confirmation with failure recovery.
 */
export function DeleteControl(props: Props): React.JSX.Element {
  const id = useId();
  const { open, confirmation, pending, error, remove, setOpen, setConfirmation, setError } =
    useDeletion(props);
  if (!open)
    return (
      <Button
        variant="soft"
        color="red"
        onClick={() => {
          setOpen(true);
        }}
      >
        {props.label}
      </Button>
    );
  return (
    <section className="delete-confirmation" aria-label={props.label}>
      <h3>{props.label}</h3>
      <p>{props.description}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void remove();
        }}
      >
        <label htmlFor={id}>Type DELETE to confirm</label>
        <input
          id={id}
          value={confirmation}
          onChange={(event) => {
            setConfirmation(event.target.value);
          }}
          autoComplete="off"
          disabled={pending}
        />
        {error !== null && <Feedback message={error} />}
        <div className="button-row">
          <Button type="submit" color="red" disabled={pending || confirmation !== 'DELETE'}>
            {pending ? 'Deleting…' : 'Permanently delete'}
          </Button>
          <Button
            type="button"
            variant="soft"
            disabled={pending}
            onClick={() => {
              setOpen(false);
              setConfirmation('');
              setError(null);
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </section>
  );
}
interface DeletionState {
  open: boolean;
  confirmation: string;
  pending: boolean;
  error: string | null;
  remove: () => Promise<void>;
  setOpen: (open: boolean) => void;
  setConfirmation: (text: string) => void;
  setError: (error: string | null) => void;
}
function useDeletion(props: Props): DeletionState {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function remove(): Promise<void> {
    if (confirmation !== 'DELETE' || pending) return;
    setPending(true);
    setError(null);
    try {
      await props.onDelete();
      setOpen(false);
      setConfirmation('');
    } catch {
      setError('Deletion could not be confirmed. Please retry before creating new entries.');
    } finally {
      setPending(false);
    }
  }

  return { open, confirmation, pending, error, remove, setOpen, setConfirmation, setError };
}
