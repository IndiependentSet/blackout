import type { ReactNode } from 'react';
import { cx } from './cx';
import styles from './ListRow.module.css';

/** A row in a list of people or boards. */
export function ListRow({ active, className, children }: { active?: boolean; className?: string; children: ReactNode }) {
  return <div className={cx(styles.row, active && styles.active, className)}>{children}</div>;
}

/** A ranked row: position, name (a link unless it is you), score. */
export function RankRow({ rank, name, score, isSelf, onOpen }: {
  rank: number; name: string; score: number; isSelf: boolean; onOpen?: () => void;
}) {
  return (
    <ListRow active={isSelf}>
      <span className={cx(styles.rank, rank === 1 && styles.first)}>{rank}</span>
      {onOpen && !isSelf
        ? <button type="button" className={cx(styles.name, styles.link)} onClick={onOpen}>{name}</button>
        : <span className={styles.name}>{name}</span>}
      <span className={styles.score}>{score}</span>
    </ListRow>
  );
}
