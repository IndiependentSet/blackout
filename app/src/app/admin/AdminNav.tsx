import { useAuth } from '../../services/auth/authContext';
import { cx } from '../../ui';
import styles from './Admin.module.css';

export type AdminPage = 'generation' | 'playground';

const PAGES: { page: AdminPage; href: string; label: string }[] = [
  { page: 'generation', href: '/generation.html', label: 'Generation config' },
  { page: 'playground', href: '/playground.html', label: 'Playground' },
];

/** The bar across the top of every admin page. */
export function AdminNav({ current }: { current: AdminPage }) {
  const auth = useAuth();
  return (
    <nav className={styles.nav} aria-label="admin pages">
      <span className={styles.badge}>ADMIN</span>
      {PAGES.map(p => (
        <a key={p.page} href={p.href} className={cx(styles.link, p.page === current && styles.current)}
          aria-current={p.page === current ? 'page' : undefined}>{p.label}</a>
      ))}
      <a href="/" className={styles.link}>Back to the game</a>
      <span className={styles.who}>{auth.handle}</span>
    </nav>
  );
}
