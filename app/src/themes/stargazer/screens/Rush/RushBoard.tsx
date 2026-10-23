import type { SurvivalBoardRow } from '../../../../domain/survival';
import { cx } from '../../kit/cx';
import { plural } from '../../copy';
import styles from './Rush.module.css';

/* Everyone's best Meteor Rush runs, best first; the signed-in player's own row is marked. */
export function RushBoard({ rows, userId }: { rows: SurvivalBoardRow[]; userId: string | null }) {
  return (
    <ol className={styles.board} aria-label="Meteor Rush leaderboard">
      {rows.map((row, i) => (
        <li key={row.user_id} className={cx(styles.boardRow, row.user_id === userId && styles.mine)}>
          <span className={styles.rank}>{i + 1}</span><span className={styles.who}>{row.username || 'Stargazer'}</span>
          <span>{plural(row.sites, 'sky', 'skies')} · {row.score.toLocaleString()}</span>
        </li>
      ))}
    </ol>
  );
}
