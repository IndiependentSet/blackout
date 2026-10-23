import { ADMIN_PAGES, type AdminPageId } from '../../domain/adminPages';
import { useAuth } from '../../services/auth/authContext';
import { cx } from '../../themes/stargazer/kit/cx';
import styles from './Admin.module.css';

export type AdminPage = AdminPageId;

/** The bar across the top of every admin page: the wordmark, the pages as a pill tab bar, who is signed in. */
export function AdminNav({ current }: { current: AdminPage }) {
  const auth = useAuth();
  return (
    <nav className={styles.nav} aria-label="admin pages">
      <a href="/" className={styles.brand}>Stargazer <span className={styles.badge}>Admin</span></a>
      <div className={styles.tabs}>
        {ADMIN_PAGES.map(p => (
          <a key={p.id} href={p.href} className={cx(styles.tab, p.id === current && styles.tabOn)}
            aria-current={p.id === current ? 'page' : undefined}>{p.label}</a>
        ))}
      </div>
      <a href="/" className={styles.back}>Back to the sky</a>
      <span className={styles.who}>{auth.handle}</span>
    </nav>
  );
}
