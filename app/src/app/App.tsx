import { LoadoutProvider } from '../game/loadout/LoadoutProvider';
import { useAppState } from '../game/useAppState';
import { AuthProvider } from '../services/auth/AuthProvider';
import { CatastropheApp } from '../themes/catastrophe/CatastropheApp';
import { StargazerApp } from '../themes/stargazer/StargazerApp';
import { useTheme } from './useTheme';

/* The shell: the state every screen shares, and which theme draws it. Stargazer is the game; the CATASTROPHE INC.
   look is an easter egg (tap the Stargazer title seven times, or open ?skin=catastrophe) with a way back. */
function Shell() {
  const app = useAppState();
  const [theme, switchTo] = useTheme();
  return theme === 'catastrophe'
    ? <CatastropheApp app={app} onLeave={() => switchTo('stargazer')} />
    : <StargazerApp app={app} onSecret={() => switchTo('catastrophe')} />;
}

export default function App() {
  return <AuthProvider><LoadoutProvider><Shell /></LoadoutProvider></AuthProvider>;
}
