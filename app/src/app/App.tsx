import { useCallback, useState } from 'react';
import { LoadoutProvider } from '../game/loadout/LoadoutProvider';
import { useAppState } from '../game/useAppState';
import { AuthProvider } from '../services/auth/AuthProvider';
import { CatastropheApp } from '../themes/catastrophe/CatastropheApp';
import { StargazerApp } from '../themes/stargazer/StargazerApp';
import { WormholeTransit } from '../themes/transit/WormholeTransit';
import { useTheme } from './useTheme';

/* The shell: the state every screen shares, and which theme draws it. Stargazer is the game; the CATASTROPHE INC.
   look is an easter egg (tap the Stargazer title seven times, or open ?skin=catastrophe) with a way back. The seventh tap
   plays the wormhole transit over Stargazer, which lands on CATASTROPHE INC.; the URL and the way back are instant. */
function Shell() {
  const app = useAppState();
  const [theme, switchTo] = useTheme();
  const [transit, setTransit] = useState(false);
  const land = useCallback(() => { setTransit(false); switchTo('catastrophe'); }, [switchTo]);
  if (theme === 'catastrophe') return <CatastropheApp app={app} onLeave={() => switchTo('stargazer')} />;
  return (
    <>
      <StargazerApp app={app} onSecret={() => setTransit(true)} />
      {transit && <WormholeTransit onDone={land} />}
    </>
  );
}

export default function App() {
  return <AuthProvider><LoadoutProvider><Shell /></LoadoutProvider></AuthProvider>;
}
