import type { CSSProperties, ReactNode } from 'react';
import { cx } from './cx';
import styles from './Stat.module.css';

/** A big number over a small caption. */
export function Stat({ value, label, tone = 'paper', basis = 140 }: {
  value: ReactNode; label: string; tone?: 'paper' | 'lilac'; basis?: number;
}) {
  return (
    <div className={cx(styles.stat, tone === 'lilac' && styles.lilac)} style={{ ['--basis' as string]: basis + 'px' } as CSSProperties}>
      <div className={styles.value}>{value}</div>
      <div className={styles.label}>{label}</div>
    </div>
  );
}
