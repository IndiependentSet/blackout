import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../../ui';
import styles from './Demos.module.css';

/** The plank floor the demos sit on. */
export function Floor({ pad = 10, children }: { pad?: number; children: ReactNode }) {
  return <div className={styles.floor} style={{ padding: pad }}>{children}</div>;
}

/** A rubber stamp that slams down when it appears; remount it (new `key`) to replay. */
export function Stamp({ tone, style, children }: { tone?: 'pink' | 'rose'; style?: CSSProperties; children: ReactNode }) {
  return <span className={cx(styles.stamp, tone && styles[tone])} style={style}>{children}</span>;
}
