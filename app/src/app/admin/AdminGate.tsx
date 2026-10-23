import type { ReactNode } from 'react';
import { useAuth } from '../../services/auth/authContext';
import { useIsAdmin } from '../../services/auth/useIsAdmin';
import { Button } from '../../themes/stargazer/kit/Button';
import styles from './Admin.module.css';

const home = () => window.location.assign('/');

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.gate}>
      <div className={styles.gateEyebrow}>Stargazer · admin</div>
      <h1 className={styles.gateTitle}>{title}</h1>
      <div className={styles.gateCopy}>{children}</div>
      <Button kind="outline" size="md" onClick={home}>Back to the sky</Button>
    </div>
  );
}

/* Only admins get past this. It is a courtesy, not the security boundary:
   the admin pages generate levels locally and write only through the
   admin-checked functions in Postgres. Must sit inside an AuthProvider. */
export function AdminGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { admin, error } = useIsAdmin(auth.userId);

  if (!auth.ready) return <Notice title="Checking your pass…">One moment.</Notice>;
  if (!auth.userId) {
    return <Notice title="Sign in first">Sign in at the Observatory, then come back to this page.</Notice>;
  }
  if (error) return <Notice title="Can’t check your pass"><span className={styles.gateError} role="alert">{error}</span></Notice>;
  if (admin === null) return <Notice title="Checking your pass…">One moment.</Notice>;
  if (!admin) return <Notice title="Admins only">{auth.handle || 'This account'} isn’t on the admin list.</Notice>;
  return <>{children}</>;
}
