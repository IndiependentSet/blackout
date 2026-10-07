import { displayName } from '../../domain/profile';
import type { Profile } from '../../domain/types';
import { Button, Panel, cx } from '../../ui';
import { bar, NO_SCORES, verdict, type Scores } from './versus';
import styles from './Crew.module.css';

/** You against a workmate, this week and all-time. */
export function HeadToHead({ me, person, mine, theirs, onChallenge }: {
  me: Profile | null | undefined; person: Profile; mine: Scores | undefined; theirs: Scores | undefined;
  /** open the 1vs1 lobby with this workmate picked */
  onChallenge?: () => void;
}) {
  const ms = mine ?? NO_SCORES, vs = theirs ?? NO_SCORES;
  const rows = [
    { label: 'THIS WEEK', left: ms.week_score, right: vs.week_score, pct: bar(ms.week_score, vs.week_score) },
    { label: 'ALL-TIME', left: ms.score, right: vs.score, pct: bar(ms.score, vs.score) },
  ];
  return (
    <Panel tab="SITE-BY-SITE COMPARISON">
      <div className={styles.versus}>
        <div className={cx(styles.side, styles.left)}>
          <div className={styles.sideName}>{displayName(me)}</div>
          <div className={styles.sideNote}>YOU</div>
        </div>
        <div className={styles.vs}>VS</div>
        <div className={cx(styles.side, styles.right)}>
          <div className={styles.sideName}>{displayName(person)}</div>
          <div className={styles.sideNote}>WORKMATE</div>
        </div>
      </div>
      {rows.map(r => (
        <div key={r.label} className={styles.compare}>
          <div className={styles.numbers}>
            <span className={cx(styles.num, r.left >= r.right && styles.lead)}>{r.left}</span>
            <span className={styles.scope}>{r.label}</span>
            <span className={cx(styles.num, r.right >= r.left && styles.lead)}>{r.right}</span>
          </div>
          <div className={styles.track}>
            <div className={styles.mine} style={{ width: r.pct[0] + '%' }} />
            <div className={styles.rest} />
            <div className={styles.theirs} style={{ width: r.pct[1] + '%' }} />
          </div>
        </div>
      ))}
      <div className={styles.result}>{verdict(ms.score, vs.score)}</div>
      {onChallenge && (
        <div className={styles.buttons}>
          <Button onClick={onChallenge} style={{ flex: '1 1 150px' }}>CHALLENGE LIVE</Button>
        </div>
      )}
    </Panel>
  );
}
