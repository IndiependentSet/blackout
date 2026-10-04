/* Dev-only entry: the level generator playground, served by `npm run dev` at
   /playground.html. Not a build input, so it never ships. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/global.css';
import { PlaygroundScreen } from './screens/Playground/PlaygroundScreen';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <PlaygroundScreen />
  </StrictMode>,
);
