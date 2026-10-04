import type { CSSProperties } from 'react';
import type { Grade } from '../domain/types';
import { cx } from './cx';
import styles from './GradeBadge.module.css';

/** A site's letter grade. `size="sm"` is the plaque chip; larger uses go through `style`. */
export function GradeBadge({ grade, size = 'sm', style }: { grade: Grade; size?: 'sm'; style?: CSSProperties }) {
  return <span className={cx(styles.badge, styles[size], styles[grade])} style={style}>{grade}</span>;
}
