/* Admin entry: a pool mode's page, at /pools.html?mode=campaign|survival|match (Voyage, Meteor Rush, Star Duel). */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import { AdminPage } from './app/admin/AdminPage';
import { POOL_PAGE, poolModeFromSearch } from './domain/adminPages';
import { LevelPoolsScreen } from './screens/LevelPools/LevelPoolsScreen';

const mode = poolModeFromSearch(window.location.search);

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <AdminPage current={POOL_PAGE[mode]}><LevelPoolsScreen mode={mode} /></AdminPage>
  </StrictMode>,
);
