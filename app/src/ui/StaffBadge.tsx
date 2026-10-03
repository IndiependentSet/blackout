import { cx } from './cx';
import styles from './StaffBadge.module.css';

export interface StaffBadgeInfo { label: string; sub: string }

/** The staff-login button: who you're signed in as, or an invitation to sign in. */
export function StaffBadge({ label, sub, layout, onClick }: StaffBadgeInfo & { layout: 'row' | 'stack'; onClick: () => void }) {
  return (
    <button type="button" className={cx(styles.badge, styles[layout])} onClick={onClick}>
      <span className={styles.label}>{label}</span>
      <span className={styles.sub}>{sub}</span>
    </button>
  );
}
