import type { ReactNode } from 'react';
import { cx } from './cx';
import { ChevronIcon } from './icons';
import styles from './ListCard.module.css';

/** One card holding a list of rows, split by hairlines. */
export const ListCard = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cx(styles.card, className)}>{children}</div>
);

interface RowProps {
  title: string;
  /** a description under the title (13px soft) */
  description?: string;
  /** a value on the right, before the chevron */
  detail?: ReactNode;
  /** a mint pill beside the value ("1 request", "2 waiting") */
  badge?: string;
  /** a round icon or picture at the left */
  icon?: ReactNode;
  /** text that replaces the chevron ("Fly to 15") */
  action?: ReactNode;
  actionTone?: 'gold' | 'mars' | 'mint';
  onClick: () => void;
}

/** A tappable row of a `ListCard`: title (and description), what it holds, and a chevron saying it opens. */
export function ListRow({ title, description, detail, badge, icon, action, actionTone = 'gold', onClick }: RowProps) {
  return (
    <button className={styles.row} onClick={onClick}>
      {icon}
      <span className={styles.text}><b>{title}</b>{description && <span className={styles.description}>{description}</span>}</span>
      {badge && <span className={styles.badge}>{badge}</span>}
      {detail !== undefined && <span className={styles.detail}>{detail}</span>}
      {action ? <span className={cx(styles.action, styles['action-' + actionTone])}>{action}</span> : <span className={styles.chevron}><ChevronIcon /></span>}
    </button>
  );
}
