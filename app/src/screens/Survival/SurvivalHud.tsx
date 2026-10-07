import { formatClock, type RunSummary } from '../../domain/survival';
import type { RecordStatus } from '../../game/hooks/useSurvivalRecorder';
import { IS_MOCK_SOURCE } from '../../services/levels';
import { Tag, cx } from '../../ui';
import styles from './Survival.module.css';

/** the clock turns urgent for the last half minute */
const LOW_MS = 30_000;

interface Props {
  remainingMs: number;
  summary: RunSummary;
  signedIn: boolean;
  /** how the run is being registered; only 'unsaved' is worth saying out loud */
  recording?: RecordStatus;
}

/* Above the board while a run is on: the clock, and what the run has banked so far. */
export function SurvivalHud({ remainingMs, summary, signedIn, recording }: Props) {
  return (
    <div className={styles.hud}>
      <span className={cx(styles.clock, remainingMs <= LOW_MS && styles.low)} role="timer" aria-label="time left">{formatClock(remainingMs)}</span>
      <span className={styles.stat}>{summary.sites} {summary.sites === 1 ? 'SITE' : 'SITES'}</span>
      <span className={styles.stat}>{summary.score.toLocaleString()} PTS</span>
      {IS_MOCK_SOURCE && <Tag tone="orchid" size="sm">DEV MOCK</Tag>}
      {!signedIn && <span className={styles.note}>SIGN IN TO RANK</span>}
      {recording === 'unsaved' && <span className={styles.note} role="status">NOT SAVED — PLAYING LOCALLY</span>}
    </div>
  );
}
