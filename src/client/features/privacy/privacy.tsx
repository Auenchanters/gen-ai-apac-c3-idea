import {
  DownloadSimpleIcon as DownloadSimple,
  ShieldCheckIcon as ShieldCheck
} from '@phosphor-icons/react';
import { Button } from '@radix-ui/themes';
import { useState } from 'react';
import { z } from 'zod';
import { Feedback } from '../../app/feedback.js';
import { detailSchema } from '../../lib/contracts.js';
import { useAuth } from '../auth/auth.js';
import { DeleteControl } from './delete-control.js';

/** Provides transparent retention, export, deletion, and safety information.
 * @returns Caller-owned privacy controls.
 */
export default function Privacy(): React.JSX.Element {
  const { api } = useAuth();
  const { pending, error, status, download, setStatus } = useJournalExport();
  return (
    <div className="page-width privacy-page">
      <header className="page-heading">
        <ShieldCheck size={32} aria-hidden="true" />
        <h1>Your writing. Your choice.</h1>
        <p>Understand what is stored and stay in control of it.</p>
      </header>
      <PrivacyInformation />
      <section>
        <h2>Take your writing with you</h2>
        <p>Download all your saved journal data as a readable JSON file.</p>
        <Button
          disabled={pending}
          onClick={() => {
            void download();
          }}
        >
          <DownloadSimple aria-hidden="true" />
          {pending ? 'Preparing export…' : 'Export journal data'}
        </Button>
      </section>
      <section className="danger-zone">
        <h2>Delete your journal data</h2>
        <p>
          This permanently removes your journal conversations, summaries, and memories from
          Daymark’s active database. It does not delete your Google account or Firebase sign-in
          record. Provider retention and backups are governed separately by the configured Google
          services.
        </p>
        <DeleteControl
          label="Delete all journal data"
          description="All saved journals and memories will be permanently removed. Download an export first if you want a copy."
          onDelete={async () => {
            await api.send('/api/account-data', 'DELETE', z.undefined());
            setStatus('Your journal data has been deleted.');
          }}
        />
      </section>
      {error !== null && <Feedback message={error} />}
      <p role="status">{status}</p>
      <section className="safety-note">
        <h2>A writing companion, not medical care</h2>
        <p>
          Gemini can be mistaken. Daymark does not diagnose, provide treatment, or replace
          professional support. If you are in immediate danger, contact local emergency services or
          someone you trust.
        </p>
      </section>
    </div>
  );
}

function PrivacyInformation(): React.JSX.Element {
  return (
    <>
      <section>
        <h2>What Daymark stores</h2>
        <p>
          Your journal titles, messages, summaries, themes, and Context Contract items are kept in
          your account until you delete them. There is no automatic expiry.
        </p>
        <p>
          Firebase manages sign-in. The server checks your identity before accessing your Firestore
          records. Journal content is sent to Google’s Gemini service to produce replies and
          summaries; it is not end-to-end encrypted from the service operator.
        </p>
      </section>
      <section>
        <h2>How context works</h2>
        <p>
          Replies use recent messages, the saved summary, and memories you explicitly approve in
          that journal. Rejecting a memory does not remove its source text or summary. Delete the
          journal to remove its stored conversation and derived context.
        </p>
        <p>
          No advertising, analytics trackers, public sharing, or third-party notification
          integrations are included.
        </p>
      </section>
    </>
  );
}
function useJournalExport(): {
  pending: boolean;
  error: string | null;
  status: string;
  download: () => Promise<void>;
  setStatus: (status: string) => void;
} {
  const { api } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  async function download(): Promise<void> {
    setPending(true);
    setError(null);
    setStatus('');
    try {
      const data = await api.get(
        '/api/export',
        z.object({ exportedAt: z.string(), journals: z.array(detailSchema) })
      );
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = 'daymark-export.json';
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
      setStatus('Your export is ready. Keep the downloaded file private.');
    } catch {
      setError('Your export could not be prepared. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return { pending, error, status, download, setStatus };
}
