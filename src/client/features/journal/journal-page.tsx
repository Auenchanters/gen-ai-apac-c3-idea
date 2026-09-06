import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { z } from 'zod';

import { Feedback, Loading } from '../../app/feedback.js';
import { detailSchema } from '../../lib/contracts.js';
import { useQuery } from '../../lib/use-query.js';
import { useAuth } from '../auth/auth.js';
import { Conversation } from './conversation.js';

function JournalLoader({ id }: { id: string }): React.JSX.Element {
  const { api } = useAuth();
  const query = useQuery(
    useCallback(() => api.get(`/api/journals/${id}`, detailSchema), [api, id])
  );
  if (query.loading) return <Loading />;
  if (query.error !== null) return <Feedback message={query.error} retry={query.reload} />;
  if (query.data === null) return <Feedback message="This journal is unavailable." />;
  return <Conversation initial={query.data} />;
}

/** Loads only a validated journal identifier from the route.
 * @returns Private conversation route.
 */
export default function JournalPage(): React.JSX.Element {
  const params = useParams();
  const id = z.uuid().safeParse(params['journalId']);
  return id.success ? (
    <JournalLoader key={id.data} id={id.data} />
  ) : (
    <Feedback message="This journal is unavailable." />
  );
}
