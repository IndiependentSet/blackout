/* Admin entry: the level pools page, at /pools.html. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/global.css';
import { AdminPage } from './app/admin/AdminPage';
import { LevelPoolsScreen } from './screens/LevelPools/LevelPoolsScreen';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <AdminPage current="pools"><LevelPoolsScreen /></AdminPage>
  </StrictMode>,
);
