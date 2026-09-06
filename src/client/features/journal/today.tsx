import { ArrowRightIcon as ArrowRight, SparkleIcon as Sparkle } from '@phosphor-icons/react';
import { Button } from '@radix-ui/themes';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Feedback } from '../../app/feedback.js';
import { ApiError } from '../../lib/api.js';
import { journalSchema } from '../../lib/contracts.js';
import { useAuth } from '../auth/auth.js';

/** Creates a journal with an explicit title and conversational tone.
 * @returns New journal screen.
 */
export default function Today(): React.JSX.Element {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [tone, setTone] = useState('gentle');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function create(): Promise<void> {
    setPending(true);
    setError(null);
    try {
      const journal = await api.send('/api/journals', 'POST', journalSchema, {
        title: title.trim(),
        tone
      });
      await navigate(`/journals/${journal.id}`);
    } catch (failure) {
      setError(
        failure instanceof ApiError
          ? failure.message
          : 'We could not start your journal. Try again.'
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="page-width">
      <TodayIntro />
      <form
        className="new-journal"
        onSubmit={(event) => {
          event.preventDefault();
          void create();
        }}
      >
        <label htmlFor="journal-title">Journal title</label>
        <input
          id="journal-title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
          }}
          maxLength={120}
          required
          placeholder="A new direction, a small win, a busy day…"
          disabled={pending}
        />
        <ToneOptions pending={pending} tone={tone} setTone={setTone} />
        {error !== null && <Feedback message={error} />}
        <Button size="3" type="submit" disabled={pending || title.trim() === ''}>
          {pending ? 'Starting…' : 'Start a journal'}
          <ArrowRight aria-hidden="true" />
        </Button>
      </form>
      <ContextExplanation />
    </div>
  );
}

function ToneOptions(props: {
  pending: boolean;
  tone: string;
  setTone: (tone: string) => void;
}): React.JSX.Element {
  return (
    <fieldset disabled={props.pending}>
      <legend>How would you like to think together?</legend>
      <div className="tone-options">
        {[
          { value: 'gentle', label: 'Gently', description: 'Room to explore' },
          { value: 'practical', label: 'Practically', description: 'Find a next step' },
          { value: 'curious', label: 'With curiosity', description: 'Try a new angle' }
        ].map((option) => (
          <label
            className="tone-option"
            key={option.value}
            htmlFor={`tone-${option.value}`}
            aria-label={option.label}
          >
            <input
              type="radio"
              id={`tone-${option.value}`}
              name="tone"
              value={option.value}
              checked={props.tone === option.value}
              onChange={() => {
                props.setTone(option.value);
              }}
            />
            <span>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
function ContextExplanation(): React.JSX.Element {
  return (
    <section className="context-explainer">
      <Sparkle size={24} aria-hidden="true" />
      <div>
        <h2>You decide what stays.</h2>
        <p>
          Gemini may suggest memories as you write. Approve the ones you want in future
          conversations, and change your mind whenever you like.
        </p>
      </div>
    </section>
  );
}

function TodayIntro(): React.JSX.Element {
  return (
    <>
      <p className="eyebrow">Make room for today</p>
      <h1>What’s on your mind?</h1>
      <p className="page-intro">
        Start with a thought, a decision, or a day worth remembering. You don’t need to have it
        figured out.
      </p>
    </>
  );
}
