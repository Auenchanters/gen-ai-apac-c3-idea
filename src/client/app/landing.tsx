import {
  ArrowRightIcon as ArrowRight,
  BookOpenIcon as BookOpen,
  CheckCircleIcon as CheckCircle,
  GoogleLogoIcon as GoogleLogo
} from '@phosphor-icons/react';
import { Button } from '@radix-ui/themes';

import hero from '../assets/daymark-paper-landscape.png';
import { useAuth } from '../features/auth/auth.js';
import { Feedback } from './feedback.js';

/** Public introduction and federated sign-in.
 * @returns Daymark sign-in screen.
 */
export function Landing(): React.JSX.Element {
  const { state, error, signIn } = useAuth();
  const unavailable = state.status === 'error';
  return (
    <main id="main-content" className="landing" tabIndex={-1}>
      <section className="hero-copy" aria-labelledby="welcome-title">
        <p className="eyebrow">A little room to think</p>
        <h1 id="welcome-title">
          Your thoughts.
          <br />A clearer path.
        </h1>
        <p className="hero-description">
          Talk things through with Gemini. Keep a journal that remembers only what you choose.
        </p>
        <Button
          size="3"
          className="primary-action"
          disabled={unavailable || state.status === 'loading'}
          onClick={() => {
            void signIn();
          }}
        >
          <GoogleLogo size={20} aria-hidden="true" />
          Continue with Google
          <ArrowRight size={18} aria-hidden="true" />
        </Button>
        {error !== null && <Feedback message={error} />}
        {unavailable ? (
          <Feedback
            message="Daymark could not connect to sign-in. Please try again."
            retry={() => {
              window.location.reload();
            }}
          />
        ) : null}
      </section>
      <figure className="hero-art">
        <img
          src={hero}
          width="1448"
          height="1086"
          fetchPriority="high"
          alt="An open notebook unfolding into a green paper landscape with a winding path."
        />
      </figure>
      <LandingNote />
      <footer className="landing-footer">
        <span>Daymark is a writing companion, not medical care.</span>
        <a
          href="https://github.com/Auenchanters/gen-ai-apac-c3-idea"
          target="_blank"
          rel="noreferrer"
        >
          Explore the project
        </a>
      </footer>
    </main>
  );
}

function LandingNote(): React.JSX.Element {
  return (
    <section className="landing-note" aria-label="Your journal, your choices">
      <BookOpen size={28} aria-hidden="true" />
      <div>
        <h2>More than a conversation.</h2>
        <p>
          Each reflection becomes a saved summary. Review suggested memories before they shape
          future replies.
        </p>
      </div>
      <p className="privacy-note">
        <CheckCircle size={20} aria-hidden="true" />
        Personal by design. Export or delete your writing whenever you choose.
      </p>
    </section>
  );
}
