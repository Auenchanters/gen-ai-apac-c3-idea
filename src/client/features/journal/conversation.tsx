import { SparkleIcon } from '@phosphor-icons/react';
import type { JournalDetail } from '../../lib/contracts.js';
import { MemoryPanel } from '../memory/memory-panel.js';
import { Composer } from './composer.js';
import { useConversation } from './use-conversation.js';

function Messages(props: { readonly messages: JournalDetail['messages'] }): React.JSX.Element {
  return (
    <>
      <ol className="message-list" aria-label="Conversation">
        {props.messages.map((message) => (
          <li key={message.id} className={`message message-${message.role}`}>
            <span className="message-author">{message.role === 'user' ? 'You' : 'Gemini'}</span>
            <p>{message.text}</p>
          </li>
        ))}
      </ol>
      {props.messages.length === 0 && (
        <div className="conversation-empty">
          <SparkleIcon size={30} aria-hidden="true" />
          <h2>Begin wherever you are.</h2>
          <p>
            Tell me what happened, what you’re working through, or what you’d like to understand.
          </p>
        </div>
      )}
    </>
  );
}

/** Renders an atomically saved conversation and explicit memory controls.
 * @param props - Persisted initial journal.
 * @param props.initial - Owned conversation loaded from the backend.
 * @returns Conversation and Context Contract panel.
 */
export function Conversation(props: { readonly initial: JournalDetail }): React.JSX.Element {
  const state = useConversation(props.initial);
  const { detail } = state;
  return (
    <div className="journal-layout">
      <section className="conversation">
        <header className="journal-heading">
          <p className="eyebrow">Your reflection</p>
          <h1>{detail.journal.title}</h1>
          <p className="save-state" aria-live="polite">
            {state.pending
              ? 'Thinking and saving…'
              : state.retry === null
                ? 'All reflections saved'
                : 'Draft awaiting confirmation'}
          </p>
        </header>
        <Messages messages={detail.messages} />
        <Composer state={state} />
      </section>
      <MemoryPanel
        journalId={detail.journal.id}
        items={detail.memories}
        messages={detail.messages}
        onChange={state.updateMemories}
        summary={detail.journal.summary}
        nextStep={detail.journal.nextStep}
      />
    </div>
  );
}
