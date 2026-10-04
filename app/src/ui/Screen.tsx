import type { ReactNode } from 'react';
import { Button } from './Button';
import styles from './Screen.module.css';

/** The dark page every full-screen view sits on, with a centred column. */
export function Screen({ maxWidth = 720, gap, children }: { maxWidth?: number; gap?: number; children: ReactNode }) {
  return (
    <div className={styles.screen}>
      <div className={styles.inner} style={{ maxWidth, gap }}>{children}</div>
    </div>
  );
}

/** Back button on the left, stroked title on the right. */
export function ScreenHeader({ title, backLabel, onBack }: { title: string; backLabel: string; onBack: () => void }) {
  return (
    <div className={styles.header}>
      <Button variant="glass" size="nav" onClick={onBack}>{'‹ ' + backLabel}</Button>
      <div className={styles.title}>{title}</div>
    </div>
  );
}
