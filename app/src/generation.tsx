/* Admin entry: the generation config page, at /generation.html. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/global.css';
import { AdminPage } from './app/admin/AdminPage';
import { GenerationConfigScreen } from './screens/GenerationConfig/GenerationConfigScreen';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <AdminPage current="generation"><GenerationConfigScreen /></AdminPage>
  </StrictMode>,
);
