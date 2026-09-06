import type { JournalDetail, Memory } from '../../lib/contracts.js';
import { MemoryItem } from './memory-item.js';

interface Props {
  readonly journalId: string;
  readonly items: Memory[];
  readonly messages: JournalDetail['messages'];
  readonly onChange: (items: Memory[]) => void;
  readonly summary: string;
  readonly nextStep: string;
}

/** Displays the saved summary and consent-controlled conversational context.
 * @param props - Owned journal content and saved-memory update callback.
 * @returns Collapsible Context Contract sidebar.
 */
export function MemoryPanel(props: Props): React.JSX.Element {
  return (
    <aside className="context-panel" aria-label="Journal summary and memories">
      <section>
        <h2>Your summary</h2>
        <p>
          {props.summary === ''
            ? 'Your first reflection will create a summary here.'
            : props.summary}
        </p>
        {props.nextStep !== '' && (
          <>
            <h3>A possible next step</h3>
            <p>{props.nextStep}</p>
          </>
        )}
      </section>
      <details className="context-contract" open>
        <summary>
          Context Contract <span>({props.items.length})</span>
        </summary>
        <p>
          Only approved memories are reused as explicit context in this journal. Recent messages and
          its summary also inform replies.
        </p>
        {props.items.length === 0 ? (
          <p className="empty-note">No suggested memories yet. Nothing to approve.</p>
        ) : (
          <ul className="memory-list">
            {props.items.map((item) => (
              <MemoryItem
                key={`${item.id}-${String(item.revision)}`}
                item={item}
                journalId={props.journalId}
                sourceText={
                  props.messages
                    .filter((message) => item.sourceMessageIds.includes(message.id))
                    .map((message) => message.text)
                    .join('\n') || 'Source is not available in this view.'
                }
                onSave={(saved) => {
                  props.onChange(
                    saved === null
                      ? props.items.filter((memory) => memory.id !== item.id)
                      : props.items.map((memory) => (memory.id === saved.id ? saved : memory))
                  );
                }}
              />
            ))}
          </ul>
        )}
      </details>
    </aside>
  );
}
