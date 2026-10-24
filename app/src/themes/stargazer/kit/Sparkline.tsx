import { sparkPoints } from '../../../domain/stats';
import styles from './Sparkline.module.css';

/** A thin line through `values`, oldest to newest, with a dot on the latest: a rating over time, with no axes to read. */
export function Sparkline({ values, label, width = 280, height = 48 }: { values: readonly number[]; label: string; width?: number; height?: number }) {
  const pad = 5;
  const pts = sparkPoints(values, width - pad * 2, height - pad * 2).map(([x, y]) => [x + pad, y + pad] as const);
  if (pts.length === 0) return null;
  const last = pts[pts.length - 1];
  return (
    <svg className={styles.spark} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} preserveAspectRatio="none">
      {pts.length > 1 && <polyline className={styles.line} points={pts.map(p => p.join(',')).join(' ')} />}
      <circle className={styles.dot} cx={last[0]} cy={last[1]} r="3.5" />
    </svg>
  );
}
