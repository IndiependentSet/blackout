import { ADMIN_GROUPS, ADMIN_PAGES, type AdminPageId } from '../../domain/adminPages';
import { useAuth } from '../../services/auth/authContext';
import { cx } from '../../themes/stargazer/kit/cx';
import styles from './Admin.module.css';

export type AdminPage = AdminPageId;

/** The bar across the top of every admin page: the wordmark, the pages in their two groups (where levels go, how
    they're made) as pill tab bars, who is signed in. */
export function AdminNav({ current }: { current: AdminPage }) {
  const auth = useAuth();
  return (
    <nav className={styles.nav} aria-label="admin pages">
      <a href="/" className={styles.brand}>Stargazer <span className={styles.badge}>Admin</span></a>
      {ADMIN_GROUPS.map(g => (
        <div key={g.id} className={styles.group} role="group" aria-label={g.label}>
          <span className={styles.groupLabel} aria-hidden="true">{g.label}</span>
          <div className={styles.tabs}>
            {ADMIN_PAGES.filter(p => p.group === g.id).map(p => (
              <a key={p.id} href={p.href} title={p.hint} className={cx(styles.tab, p.id === current && styles.tabOn)}
                aria-current={p.id === current ? 'page' : undefined}>{p.label}</a>
            ))}
          </div>
        </div>
      ))}
      <a href="/" className={styles.back}>Back to the sky</a>
      <span className={styles.who}>{auth.handle}</span>
    </nav>
  );
}
