import type { ReactNode } from 'react';
import { AuthProvider } from '../../services/auth/AuthProvider';
import { AdminGate } from './AdminGate';
import { AdminNav, type AdminPage as Page } from './AdminNav';

/** The frame every admin entry renders: sign-in state, the admin gate, the nav. */
export function AdminPage({ current, children }: { current: Page; children: ReactNode }) {
  return (
    <AuthProvider>
      <AdminGate>
        <AdminNav current={current} />
        {children}
      </AdminGate>
    </AuthProvider>
  );
}
