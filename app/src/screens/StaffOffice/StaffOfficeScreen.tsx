import { useState } from 'react';
import { signOut } from '../../services/repositories/auth';
import { useAuth } from '../../services/auth/authContext';
import { useIsAdmin } from '../../services/auth/useIsAdmin';
import { Button, Screen, ScreenHeader } from '../../ui';
import { CrewScreen } from '../Crew/CrewScreen';
import { IdCard } from './IdCard';
import { Leaderboard } from './Leaderboard';
import { isEmail } from './email';
import { LinkSent, SignInForm } from './SignInCard';
import { useMagicLink } from './useMagicLink';
import styles from './StaffOffice.module.css';

/* STAFF OFFICE: optional passwordless account + leaderboard, layered over the
   game as its own full-page screen. Who is signed in comes from the one auth
   provider, so this and the badge on the other screens always agree. */
export function StaffOfficeScreen({ onClose, weeklyPerfect }: { onClose: () => void; weeklyPerfect: number }) {
  const auth = useAuth();
  const link = useMagicLink();
  const [email, setEmail] = useState('');
  const [crewOpen, setCrewOpen] = useState(false);
  const { admin } = useIsAdmin(auth.userId);

  if (crewOpen && auth.userId) return <CrewScreen userId={auth.userId} onClose={() => setCrewOpen(false)} />;

  const send = () => { const v = email.trim(); if (isEmail(v)) link.send(v); };

  return (
    <Screen>
      <ScreenHeader title="STAFF OFFICE" backLabel="BACK TO SITE" onBack={onClose} />

      {!auth.ready && <div className={styles.loading}>CHECKING BADGE&hellip;</div>}

      {auth.ready && !auth.userId && link.phase !== 'sent' && (
        <SignInForm email={email} sending={link.phase === 'sending'} error={link.error}
          onEmail={v => { setEmail(v); link.clearError(); }} onSend={send} onOAuth={link.oauth} />
      )}
      {auth.ready && !auth.userId && link.phase === 'sent' && <LinkSent email={email} onBack={link.reset} />}

      {auth.userId && (
        <div className={styles.stack}>
          <IdCard userId={auth.userId} email={auth.email ?? ''} username={auth.username} weeklyPerfect={weeklyPerfect}
            onSaved={auth.setHandle} onSignOut={signOut} onOpenCrew={() => setCrewOpen(true)} />
          <Leaderboard userId={auth.userId} />
          {admin && <Button variant="glass" size="nav" onClick={() => window.location.assign('/generation.html')}>ADMIN TOOLS ›</Button>}
        </div>
      )}
    </Screen>
  );
}
