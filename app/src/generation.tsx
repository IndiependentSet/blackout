/* Admin entry: Tonight (the daily week's generation config), at /generation.html. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import { AdminPage } from './app/admin/AdminPage';
import { GenerationConfigScreen } from './screens/GenerationConfig/GenerationConfigScreen';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <AdminPage current="tonight"><GenerationConfigScreen /></AdminPage>
  </StrictMode>,
);
