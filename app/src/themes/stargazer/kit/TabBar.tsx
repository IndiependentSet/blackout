import type { ReactNode } from 'react';
import { BookIcon, MoonIcon, UserIcon } from './icons';
import { cx } from './cx';
import styles from './kit.module.css';

export type Tab = 'tonight' | 'atlas' | 'me';

const TABS: { tab: Tab; label: string; icon: ReactNode }[] = [
  { tab: 'tonight', label: 'Tonight', icon: <MoonIcon /> },
  { tab: 'atlas', label: 'Atlas', icon: <BookIcon /> },
  { tab: 'me', label: 'Me', icon: <UserIcon /> },
];

/** The phone's bottom bar between the three home pages. */
export function TabBar({ active, onOpen }: { active: Tab; onOpen: (tab: Tab) => void }) {
  return (
    <nav className={styles.tabBar} aria-label="Stargazer">
      {TABS.map(t => (
        <button key={t.tab} className={cx(styles.tab, active === t.tab && styles.tabOn)} aria-current={active === t.tab ? 'page' : undefined}
          onClick={() => onOpen(t.tab)}>
          {t.icon}{t.label}
        </button>
      ))}
    </nav>
  );
}
