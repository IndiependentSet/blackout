import { ADMIN_PAGES, type AdminPageId } from '../../domain/adminPages';
import { useAuth } from '../../services/auth/authContext';
import { cx } from '../../ui';
import styles from './Admin.module.css';

export type AdminPage = AdminPageId;

/** The bar across the top of every admin page. */
export function AdminNav({ current }: { current: AdminPage }) {
  const auth = useAuth();
  return (
    <nav className={styles.nav} aria-label="admin pages">
      <span className={styles.badge}>ADMIN</span>
      {ADMIN_PAGES.map(p => (
        <a key={p.id} href={p.href} className={cx(styles.link, p.id === current && styles.current)}
          aria-current={p.id === current ? 'page' : undefined}>{p.label}</a>
      ))}
      <a href="/" className={styles.link}>Back to the game</a>
      <span className={styles.who}>{auth.handle}</span>
    </nav>
  );
}
