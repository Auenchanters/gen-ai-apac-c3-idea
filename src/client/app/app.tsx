import {
  BookOpenTextIcon as BookOpenText,
  ClockCounterClockwiseIcon as ClockCounterClockwise,
  CompassIcon as Compass,
  MoonIcon as Moon,
  SignOutIcon as SignOut,
  SunIcon as Sun,
  PencilLineIcon as PencilLine,
  ShieldCheckIcon as ShieldCheck
} from '@phosphor-icons/react';
import { Button, Theme } from '@radix-ui/themes';
import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';

import { AuthProvider, useAuth } from '../features/auth/auth.js';
import type { AuthAdapter } from '../features/auth/types.js';
import { Feedback, Loading } from './feedback.js';
import { Landing } from './landing.js';

const Today = lazy(() => import('../features/journal/today.js'));
const JournalPage = lazy(() => import('../features/journal/journal-page.js'));
const History = lazy(() => import('../features/history/history.js'));
const CompassPage = lazy(() => import('../features/compass/compass.js'));
const Privacy = lazy(() => import('../features/privacy/privacy.js'));

function RouteFocus(): null {
  const location = useLocation();
  useEffect(() => {
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }, [location.pathname]);
  return null;
}

function PrivateShell(): React.JSX.Element {
  const { state, error, signOut } = useAuth();
  return (
    <div className="workspace" key={state.status === 'signed-in' ? state.uid : 'signed-out'}>
      <aside className="sidebar">
        <p className="sidebar-label">Your space</p>
        <nav aria-label="Journal navigation">
          <NavLink to="/today">
            <PencilLine size={20} aria-hidden="true" />
            Today
          </NavLink>
          <NavLink to="/history">
            <ClockCounterClockwise size={20} aria-hidden="true" />
            History
          </NavLink>
          <NavLink to="/compass">
            <Compass size={20} aria-hidden="true" />
            Compass
          </NavLink>
          <NavLink to="/privacy">
            <ShieldCheck size={20} aria-hidden="true" />
            Privacy
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <p>
            Space for reflection.
            <br />
            Room for a next step.
          </p>
          <Button
            variant="ghost"
            onClick={() => {
              void signOut();
            }}
          >
            <SignOut size={18} aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </aside>
      <main id="main-content" className="main-panel" tabIndex={-1}>
        {error !== null && <Feedback message={error} />}
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/today" element={<Today />} />
            <Route path="/journals/:journalId" element={<JournalPage />} />
            <Route path="/history" element={<History />} />
            <Route path="/compass" element={<CompassPage />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="*" element={<Navigate to="/today" replace />} />
          </Routes>
        </Suspense>
      </main>
      <RouteFocus />
    </div>
  );
}

function ApplicationFrame(): React.JSX.Element {
  const { state } = useAuth();
  const [dark, setDark] = useState(
    () => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
  );
  return (
    <Theme
      appearance={dark ? 'dark' : 'light'}
      accentColor="grass"
      grayColor="sage"
      radius="large"
      data-theme={dark ? 'dark' : 'light'}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <NavLink to="/today" className="brand" aria-label="Daymark home">
          <BookOpenText size={27} weight="duotone" aria-hidden="true" />
          <span>daymark</span>
        </NavLink>
        <div className="header-actions">
          {state.status === 'signed-in' && <span className="account-name">{state.name}</span>}
          <Button
            variant="ghost"
            className="theme-switch"
            aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={() => {
              setDark(!dark);
            }}
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </Button>
        </div>
      </header>
      {state.status === 'signed-in' ? <PrivateShell /> : <Landing />}
    </Theme>
  );
}

/** Production application with adapters supplied solely at the entrypoint.
 * @param props - Federated authentication adapter.
 * @param props.authAdapter - Federated authentication adapter.
 * @returns Complete Daymark router and theme.
 */
export function App({ authAdapter }: { authAdapter: AuthAdapter }): React.JSX.Element {
  return (
    <AuthProvider adapter={authAdapter}>
      <BrowserRouter>
        <ApplicationFrame />
      </BrowserRouter>
    </AuthProvider>
  );
}
