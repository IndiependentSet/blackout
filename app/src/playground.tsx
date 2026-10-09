/* Admin entry: the level generator playground, at /playground.html. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/global.css';
import { AdminPage } from './app/admin/AdminPage';
import { PlaygroundScreen } from './screens/Playground/PlaygroundScreen';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <AdminPage current="playground"><PlaygroundScreen /></AdminPage>
  </StrictMode>,
);
