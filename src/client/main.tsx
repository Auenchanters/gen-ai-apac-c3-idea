import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@radix-ui/themes/styles.css';
import './styles/daymark.css';
import { App } from './app/app.js';
import { createFirebaseAuth } from './features/auth/firebase-auth.js';

const root = document.getElementById('root');
if (root === null) throw new Error('The application root is missing.');
createRoot(root).render(
  <StrictMode>
    <App authAdapter={createFirebaseAuth()} />
  </StrictMode>
);
