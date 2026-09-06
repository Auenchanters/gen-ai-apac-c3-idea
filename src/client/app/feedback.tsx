import { Button } from '@radix-ui/themes';

/** Displays an accessible, actionable failure.
 * @param props - Safe message and optional retry action.
 * @param props.message - Safe user-facing failure text.
 * @param props.retry - Optional explicit retry action.
 * @returns Inline feedback.
 */
export function Feedback({
  message,
  retry
}: {
  message: string;
  retry?: () => void;
}): React.JSX.Element {
  return (
    <div className="feedback" role="alert">
      <p>{message}</p>
      {retry !== undefined && (
        <Button variant="soft" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Announces a bounded pending action.
 * @param props - Human-readable pending state.
 * @param props.label - Accessible loading description.
 * @returns Live status message.
 */
export function Loading({
  label = 'Opening your journal…'
}: {
  label?: string;
}): React.JSX.Element {
  return (
    <div className="loading-state" role="status">
      <div className="loading-line" />
      <p>{label}</p>
    </div>
  );
}
