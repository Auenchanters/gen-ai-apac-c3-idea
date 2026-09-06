import { BookOpenTextIcon as BookOpenText, PlusIcon as Plus } from '@phosphor-icons/react';
import { Button } from '@radix-ui/themes';
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Feedback, Loading } from '../../app/feedback.js';
import { listSchema, type Journal } from '../../lib/contracts.js';
import { useQuery } from '../../lib/use-query.js';
import { useAuth } from '../auth/auth.js';
import { DeleteControl } from '../privacy/delete-control.js';

interface ResultsProps {
  readonly journals: Journal[];
  readonly reload: () => void;
}

function HistoryResults(props: ResultsProps): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState('all');
  const [now] = useState(Date.now);
  const cutoff = period === 'all' ? Number.NEGATIVE_INFINITY : now - Number(period) * 86400000;
  const journals = props.journals
    .filter(
      (journal) =>
        journal.updatedAt >= cutoff &&
        [journal.title, journal.summary, ...journal.themes]
          .join(' ')
          .toLowerCase()
          .includes(query.toLowerCase())
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return (
    <>
      <div className="history-filters">
        <div>
          <label htmlFor="journal-search">Search titles, summaries, and topics</label>
          <input
            id="journal-search"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder="Find a reflection…"
          />
        </div>
        <div>
          <label htmlFor="journal-period">Last updated</label>
          <select
            id="journal-period"
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value);
            }}
          >
            <option value="all">Any time</option>
            <option value="7">Past 7 days</option>
            <option value="30">Past 30 days</option>
          </select>
        </div>
      </div>
      {journals.length === 0 ? (
        <p className="empty-note">No reflections match your filters.</p>
      ) : (
        <ul className="journal-list">
          {journals.map((journal) => (
            <JournalEntry key={journal.id} journal={journal} reload={props.reload} />
          ))}
        </ul>
      )}
    </>
  );
}

/** Loads only the signed-in user's saved reflections, with local text and date filters.
 * @returns Private journal history.
 */
export default function History(): React.JSX.Element {
  const { api } = useAuth();
  const load = useCallback(() => api.get('/api/journals?limit=50', listSchema), [api]);
  const query = useQuery(load);
  return (
    <div className="page-width">
      <header className="page-heading">
        <h1>Your reflections</h1>
        <p>Pick up a thread or notice how far you’ve come.</p>
        <Button asChild>
          <Link to="/today">
            <Plus aria-hidden="true" />
            New journal
          </Link>
        </Button>
      </header>
      {query.loading ? <Loading /> : null}
      {query.error !== null && <Feedback message={query.error} retry={query.reload} />}
      {query.data !== null &&
        (query.data.journals.length === 0 ? (
          <section className="empty-state">
            <BookOpenText size={38} aria-hidden="true" />
            <h2>Your story starts here.</h2>
            <p>Your saved reflections will appear in this space.</p>
          </section>
        ) : (
          <HistoryResults journals={query.data.journals} reload={query.reload} />
        ))}
    </div>
  );
}

function JournalEntry(props: { journal: Journal; reload: () => void }): React.JSX.Element {
  const { api } = useAuth();
  const { journal } = props;
  return (
    <li key={journal.id}>
      <div className="journal-list-copy">
        <time dateTime={new Date(journal.updatedAt).toISOString()}>
          {new Date(journal.updatedAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </time>
        <h2>
          <Link to={`/journals/${journal.id}`}>{journal.title}</Link>
        </h2>
        <p>{journal.summary === '' ? 'An open page, ready when you are.' : journal.summary}</p>
        <div className="topic-list">
          {journal.themes.map((theme) => (
            <span key={theme}>{theme}</span>
          ))}
        </div>
      </div>
      <DeleteControl
        label={`Delete ${journal.title}`}
        description="This permanently deletes the conversation, summary, and all its memories."
        onDelete={async () => {
          await api.send(`/api/journals/${journal.id}`, 'DELETE', z.undefined());
          props.reload();
        }}
      />
    </li>
  );
}
