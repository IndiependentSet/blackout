import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/global.css';
import App from './app/App';
import { scheduleWorkerUrl } from './services/generation/scheduleClient';
import { registerServiceWorker } from './services/pwa/registerServiceWorker';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/* installable and offline once visited; never in development, where a cache would hide edits */
if (import.meta.env.PROD) registerServiceWorker(import.meta.url, [scheduleWorkerUrl]);
