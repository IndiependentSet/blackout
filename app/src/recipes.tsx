/* Admin entry: the shared generator recipes, at /recipes.html. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import { AdminPage } from './app/admin/AdminPage';
import { RecipesScreen } from './screens/Recipes/RecipesScreen';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <AdminPage current="recipes"><RecipesScreen /></AdminPage>
  </StrictMode>,
);
