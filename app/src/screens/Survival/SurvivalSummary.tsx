import { survivalHeadline, type RunSummary, type SurvivalBoardRow } from '../../domain/survival';
import type { RecordStatus } from '../../game/hooks/useSurvivalRecorder';
import { Button } from '../../ui';
import styles from './Survival.module.css';

interface Props {
  summary: RunSummary;
  /** the best run before this one, this session only */
  before: RunSummary | null;
  isRecord: boolean;
  signedIn: boolean;
  /** how this run was registered on the server */
  recording?: RecordStatus;
  /** the survival leaderboard; undefined while it loads or when it could not be read */
  board?: SurvivalBoardRow[];
  /** the signed-in player, so their own line can be marked */
  userId?: string | null;
  onAgain: () => void;
  onOpenHub: () => void;
}

/* What a finished run came to. The record is the best of this session or, for a signed-in player, the server's; the board is everyone's best run. */
export function SurvivalSummary({ summary, before, isRecord, signedIn, recording, board, userId, onAgain, onOpenHub }: Props) {
  const previous = survivalHeadline(before);
  return (
    <div className={styles.scrim}>
      <div className={styles.card} role="dialog" aria-label="survival summary">
        <div className={styles.cardHead}>
          <span className={styles.order}>SURVIVAL SHIFT</span>
          <span className={styles.title}>CLOCKED OUT</span>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.big}>
            <span className={styles.bigNum}>{summary.sites}</span>
            <span className={styles.bigLabel}>{summary.sites === 1 ? 'SITE FLATTENED' : 'SITES FLATTENED'}</span>
          </div>
          <div className={styles.row}><span>ON BUDGET</span><span>{summary.perfect}/{summary.sites}</span></div>
          <div className={styles.row}><span>SCORE</span><span>{summary.score.toLocaleString()} PTS</span></div>
          <div className={styles.record}>
            {isRecord ? (signedIn ? 'NEW PERSONAL RECORD' : 'NEW RECORD FOR THIS SESSION') : previous ?? 'NO SITES FLATTENED THIS TIME'}
          </div>
          {board && board.length > 0 && (
            <ol className={styles.board} aria-label="survival leaderboard">
              {board.map((row, i) => (
                <li key={row.user_id} className={row.user_id === userId ? styles.mine : undefined}>
                  <span>{i + 1}. {row.username || 'STAFF'}</span>
                  <span>{row.sites} {row.sites === 1 ? 'SITE' : 'SITES'} · {row.score.toLocaleString()} PTS</span>
                </li>
              ))}
            </ol>
          )}
          {!signedIn && <div className={styles.note}>SIGN IN TO RANK YOUR RUNS</div>}
          {recording === 'unsaved' && <div className={styles.note} role="status">THIS RUN WAS NOT SAVED TO THE LEADERBOARD</div>}
        </div>
        <div className={styles.actions}>
          <Button variant="glass" size="chip" onClick={onOpenHub}>DASHBOARD</Button>
          <Button variant="primary" onClick={onAgain} style={{ flex: 1 }}>PLAY AGAIN</Button>
        </div>
      </div>
    </div>
  );
}
