import { ArrowUpIcon } from '@phosphor-icons/react';
import { Button } from '@radix-ui/themes';
import { Feedback } from '../../app/feedback.js';
import type { ConversationState } from './use-conversation.js';

/** Keeps text available until persistence is confirmed, including on network failure.
 * @param props - Current draft and save controls.
 * @param props.state - Retained draft and explicit save actions.
 * @returns Accessible journal composer.
 */
export function Composer(props: { readonly state: ConversationState }): React.JSX.Element {
  const state = props.state;
  const label = state.retry === null ? 'Send reflection' : 'Retry reflection';
  return (
    <form
      className="composer"
      onSubmit={(event) => {
        event.preventDefault();
        void state.send();
      }}
    >
      <label htmlFor="reflection">Your reflection</label>
      <textarea
        id="reflection"
        rows={4}
        maxLength={4000}
        value={state.draft}
        disabled={state.pending || state.retry !== null}
        onChange={(event) => {
          state.setDraft(event.target.value);
        }}
        placeholder="A thought is enough to begin."
        required
      />
      {state.error !== null && <Feedback message={state.error} />}
      <div className="composer-footer">
        <span>{state.draft.length.toLocaleString()} / 4,000</span>
        <Button
          type="submit"
          disabled={state.pending || state.draft.trim() === ''}
          aria-label={label}
        >
          {state.pending ? 'Reflecting…' : label}
          <ArrowUpIcon size={18} aria-hidden="true" />
        </Button>
      </div>
      {state.canRevise && !state.pending ? (
        <Button type="button" variant="ghost" onClick={state.revise}>
          Edit draft before a new attempt
        </Button>
      ) : null}
      <p className="composer-note">
        Your entry and Gemini’s reply are saved together. Gemini can make mistakes.
      </p>
    </form>
  );
}
