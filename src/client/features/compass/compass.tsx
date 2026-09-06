import { CompassIcon as Compass } from '@phosphor-icons/react';
import { Button } from '@radix-ui/themes';
import { useCallback, useState } from 'react';
import { Feedback, Loading } from '../../app/feedback.js';
import { compassSchema } from '../../lib/contracts.js';
import { useQuery } from '../../lib/use-query.js';
import { useAuth } from '../auth/auth.js';

function CompassResults(props: { readonly period: 'week' | 'month' }): React.JSX.Element {
  const { api } = useAuth();
  const load = useCallback(
    () => api.send('/api/compass', 'POST', compassSchema, { period: props.period }),
    [api, props.period]
  );
  const query = useQuery(load);
  if (query.loading) return <Loading />;
  if (query.error !== null) return <Feedback message={query.error} retry={query.reload} />;
  if (query.data === null) return <></>;
  const data = query.data;
  if (data.journalCount === 0) return <EmptyCompass />;
  return (
    <div className="compass-results">
      <p className="result-count">
        Based on {data.journalCount} saved {data.journalCount === 1 ? 'journal' : 'journals'}{' '}
        updated in this period.
      </p>
      <section>
        <h2>What’s been on your mind</h2>
        <ul className="topic-counts">
          {data.topics.map((topic) => (
            <li key={topic.topic}>
              <span>{topic.topic}</span>
              <span>
                {topic.count} {topic.count === 1 ? 'journal' : 'journals'}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>What you’ve chosen to remember</h2>
        {data.memories.length === 0 ? (
          <p>No approved memories in this period.</p>
        ) : (
          <ul className="approved-memories">
            {data.memories.map((memory) => (
              <li key={memory.id}>
                <span className="memory-meta">{memory.kind}</span>
                <p>{memory.text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="muted">
        Themes are counted from saved summaries, not predictions about you. Manage memories in their
        original journal.
      </p>
    </div>
  );
}

/** Shows a bounded private retrospective without inferring diagnoses or scores.
 * @returns Period selection and deterministic journal patterns.
 */
export default function CompassPage(): React.JSX.Element {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  return (
    <div className="page-width">
      <header className="page-heading">
        <h1>A little perspective.</h1>
        <p>Your Reflection Compass brings recurring themes and approved memories into one place.</p>
      </header>
      <div className="button-row" role="group" aria-label="Reflection period">
        <Button
          variant={period === 'week' ? 'solid' : 'soft'}
          aria-pressed={period === 'week'}
          onClick={() => {
            setPeriod('week');
          }}
        >
          Past 7 days
        </Button>
        <Button
          variant={period === 'month' ? 'solid' : 'soft'}
          aria-pressed={period === 'month'}
          onClick={() => {
            setPeriod('month');
          }}
        >
          Past 30 days
        </Button>
      </div>
      <CompassResults key={period} period={period} />
    </div>
  );
}

function EmptyCompass(): React.JSX.Element {
  return (
    <section className="empty-state">
      <Compass size={38} aria-hidden="true" />
      <h2>Your patterns will appear here.</h2>
      <p>Complete a reflection, then return to see its themes and the memories you’ve approved.</p>
    </section>
  );
}
