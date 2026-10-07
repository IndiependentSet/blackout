import { useState } from 'react';
import { formatClock } from '../../domain/survival';
import type { MatchStatus } from '../../domain/types';
import { IS_MOCK_SOURCE } from '../../services/levels';
import { Button, Tag, cx } from '../../ui';
import styles from './Match.module.css';

/** the clock turns urgent for the last half minute */
const LOW_MS = 30_000;

interface Props {
  status: MatchStatus | null;
  /** ms until the first tap is allowed */
  countdown: number;
  /** ms left on the match clock */
  remaining: number;
  /** cables covered by your cats, by theirs, and the total */
  mine: number;
  theirs: number;
  total: number;
  opponentName: string;
  opponentGone: boolean;
  onForfeit: () => void;
}

function Bar({ label, covered, total, gone, tone }: { label: string; covered: number; total: number; gone?: boolean; tone?: 'theirs' }) {
  const pct = total > 0 ? Math.min(100, Math.round((covered / total) * 100)) : 0;
  return (
    <div className={styles.barRow}>
      <span className={styles.barName}>
        {tone === 'theirs' && <span className={cx(styles.dot, gone && styles.away)} aria-hidden />}{label}
      </span>
      <div className={styles.track} role="progressbar" aria-label={label + ' progress'} aria-valuemin={0} aria-valuemax={total} aria-valuenow={covered}>
        <div className={cx(styles.fill, tone && styles[tone])} style={{ width: pct + '%' }} />
      </div>
      <span>{covered}/{total}</span>
    </div>
  );
}

/* Above the board in a match: the countdown, then the clock, how far each side has got, and the one way out
   that costs you the match. Forfeiting asks twice, so a stray tap cannot lose it. */
export function MatchHud({ status, countdown, remaining, mine, theirs, total, opponentName, opponentGone, onForfeit }: Props) {
  const [sure, setSure] = useState(false);
  const them = opponentName || 'OPPONENT';
  const over = status === 'done' || status === 'void';

  return (
    <div className={styles.hud}>
      <div className={styles.hudTop}>
        {status === 'countdown' && (
          <>
            <span className={styles.count} role="timer" aria-label="starts in">{Math.max(1, Math.ceil(countdown / 1000))}</span>
            <span className={styles.stat}>GET READY</span>
          </>
        )}
        {status === 'live' && (
          <span className={cx(styles.clock, remaining <= LOW_MS && styles.low)} role="timer" aria-label="time left">{formatClock(remaining)}</span>
        )}
        {over && <span className={styles.stat}>MATCH OVER</span>}
        <span className={styles.spacer} />
        {IS_MOCK_SOURCE && <Tag tone="orchid" size="sm">DEV MOCK</Tag>}
        {status === 'live' && (
          sure
            ? <Button variant="accent" size="mini" onClick={onForfeit}>SURE? FORFEIT</Button>
            : <Button variant="muted" size="mini" onClick={() => setSure(true)}>FORFEIT</Button>
        )}
      </div>
      <div className={styles.bars}>
        <Bar label="YOU" covered={mine} total={total} />
        <Bar label={them} covered={theirs} total={total} gone={opponentGone} tone="theirs" />
      </div>
      {opponentGone && !over && <span className={styles.warn} role="status">{them} HAS LEFT THE SITE. THE CLOCK DECIDES.</span>}
    </div>
  );
}
