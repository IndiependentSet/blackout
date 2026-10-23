import type { ReactNode } from 'react';
import '../../themes/stargazer/tokens.css';
import { Starfield } from '../../themes/stargazer/kit/Starfield';
import { AuthProvider } from '../../services/auth/AuthProvider';
import { AdminGate } from './AdminGate';
import { AdminNav, type AdminPage as Page } from './AdminNav';
import styles from './Admin.module.css';

/** The frame every admin entry renders: Stargazer's night behind it, sign-in state, the admin gate, the nav. */
export function AdminPage({ current, children }: { current: Page; children: ReactNode }) {
  return (
    <div className={`sg ${styles.frame}`}>
      <Starfield wide />
      <div className={styles.content}>
        <AuthProvider>
          <AdminGate>
            <AdminNav current={current} />
            {children}
          </AdminGate>
        </AuthProvider>
      </div>
    </div>
  );
}
