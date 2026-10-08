import type { ReactNode } from 'react';
import { useAuth } from '../../services/auth/authContext';
import { useIsAdmin } from '../../services/auth/useIsAdmin';
import { Button, Message, Screen } from '../../ui';
import styles from './Admin.module.css';

const home = () => window.location.assign('/');

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Screen>
      <div className={styles.gate}>
        <div className={styles.gateTitle}>{title}</div>
        <div className={styles.gateCopy}>{children}</div>
        <Button variant="glass" size="nav" onClick={home}>‹ BACK TO THE GAME</Button>
      </div>
    </Screen>
  );
}

/* Only admins get past this. It is a courtesy, not the security boundary:
   the admin pages generate levels locally and write only through the
   admin-checked functions in Postgres. Must sit inside an AuthProvider. */
export function AdminGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { admin, error } = useIsAdmin(auth.userId);

  if (!auth.ready) return <Notice title="CHECKING BADGE…">One moment.</Notice>;
  if (!auth.userId) {
    return <Notice title="STAFF ONLY">Sign in at the Staff Office first, then come back to this page.</Notice>;
  }
  if (error) return <Notice title="CAN’T CHECK YOUR BADGE"><Message tone="error">{error}</Message></Notice>;
  if (admin === null) return <Notice title="CHECKING BADGE…">One moment.</Notice>;
  if (!admin) return <Notice title="MANAGEMENT ONLY">{auth.handle || 'This account'} isn’t on the admin list.</Notice>;
  return <>{children}</>;
}
