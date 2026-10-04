import { useState } from 'react';
import { SITES } from '../domain/sites';
import { GameScreen } from '../game/GameScreen';
import { useGameSession } from '../game/useGameSession';
import HowToPlay from '../screens/HowToPlay/HowToPlay';
import { StaffOfficeScreen } from '../screens/StaffOffice/StaffOfficeScreen';
import { WorkOrderScreen } from '../screens/WorkOrder/WorkOrderScreen';
import { perfectCount } from '../game/state/selectors';
import { AuthProvider } from '../services/auth/AuthProvider';
import { useAuth } from '../services/auth/authContext';
import { staffBadge } from './staffBadge';
import { useOrientation } from './useOrientation';

type Screen = 'workOrder' | 'game' | 'account';

/* Which full-screen view is showing, and the state that has to outlive any of
   them (today's levels and the player's board) — held here, above all three. */
function Shell() {
  const auth = useAuth();
  const session = useGameSession();
  const [screen, setScreen] = useState<Screen>('workOrder');
  const [accountFrom, setAccountFrom] = useState<Exclude<Screen, 'account'>>('workOrder');
  const orientation = useOrientation({ ready: auth.ready, signedIn: !!auth.userId, onWorkOrder: screen === 'workOrder' });

  const badge = staffBadge(auth, session.state.results);
  const openAccount = (from: Exclude<Screen, 'account'>) => { setAccountFrom(from); setScreen('account'); };

  if (screen === 'account') {
    return <StaffOfficeScreen onClose={() => setScreen(accountFrom)} weeklyPerfect={perfectCount(session.state.results)} />;
  }

  if (screen === 'game') {
    return (
      <GameScreen session={session} userId={auth.userId} badge={badge}
        onOpenAccount={() => openAccount('game')} onOpenWorkOrder={() => setScreen('workOrder')} />
    );
  }

  return (
    <>
      <WorkOrderScreen day={session.day} siteNo={session.state.idx + 1} badge={badge} keysEnabled={!orientation.open}
        onClockIn={() => setScreen('game')} onHowItWorks={orientation.show} onOpenAccount={() => openAccount('workOrder')} />
      {orientation.open && (
        <HowToPlay sites={SITES} onClose={orientation.hide} onStart={() => { orientation.hide(); setScreen('game'); }} />
      )}
    </>
  );
}

export default function App() {
  return <AuthProvider><Shell /></AuthProvider>;
}
