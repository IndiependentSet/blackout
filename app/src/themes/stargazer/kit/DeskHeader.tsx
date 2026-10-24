import type { ReactNode } from 'react';
import { plural } from '../copy';
import { cx } from './cx';
import { MoonIcon } from './icons';
import { Avatar } from './Page';
import styles from './DeskHeader.module.css';

/** Where the desktop header can go. `me` is the avatar; Stats counts as Me. */
export type DeskDest = 'tonight' | 'atlas' | 'voyage' | 'rush' | 'duel' | 'me';

const NAV: { id: Exclude<DeskDest, 'me'>; label: string }[] = [
  { id: 'tonight', label: 'Tonight' }, { id: 'atlas', label: 'Atlas' }, { id: 'voyage', label: 'Voyage' }, { id: 'rush', label: 'Rush' }, { id: 'duel', label: 'Duel' },
];

/** Nights in a row with a sky charted. */
export const StreakPill = ({ streak, className }: { streak: number; className?: string }) => (
  <div className={cx(styles.streak, className)}><MoonIcon size={16} />{plural(streak, 'night')}</div>
);

/** What a desktop page passes its header besides which place it is. */
export interface DeskProps {
  streak: number;
  initial: string;
  avatar?: string | null;
  onGo: (dest: DeskDest) => void;
}

interface Props extends DeskProps {
  active: DeskDest;
  /** the brand; Tonight passes the secret title, every other page the plain name */
  brand?: ReactNode;
}

/** The header every desktop page shares: brand, the five places to go, the streak and the way to Me. */
export function DeskHeader({ active, streak, initial, avatar, onGo, brand }: Props) {
  return (
    <header className={styles.head}>
      {brand ?? <span className={styles.brand}>Stargazer</span>}
      <nav className={styles.nav} aria-label="Stargazer">
        {NAV.map(n => (
          <button key={n.id} className={cx(styles.item, active === n.id && styles.on)} aria-current={active === n.id ? 'page' : undefined} onClick={() => onGo(n.id)}>{n.label}</button>
        ))}
      </nav>
      <div className={styles.right}>
        <StreakPill streak={streak} />
        <button className={cx(styles.me, active === 'me' && styles.meOn)} aria-label="Me" aria-current={active === 'me' ? 'page' : undefined} onClick={() => onGo('me')}>
          <Avatar letter={initial} avatar={avatar} />
        </button>
      </div>
    </header>
  );
}
