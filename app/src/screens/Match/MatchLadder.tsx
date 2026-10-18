import { displayName } from '../../domain/profile';
import { RATING_START } from '../../domain/rating';
import { Message, Panel, RankRow, Stat } from '../../ui';
import { useLadder, type LadderDeps } from './useLadder';
import styles from './Match.module.css';

/* The player's rating and the ranked ladder under it. A failed read is a message: nothing else depends on it. */
export function MatchLadder({ userId, deps }: { userId: string; deps?: LadderDeps }) {
  const ladder = useLadder(userId, deps);
  const rank = ladder.rows.findIndex(r => r.user_id === userId);
  const mine = ladder.mine;

  return (
    <>
      <Panel tab="YOUR RATING" tone="orchid">
        <div className={styles.record}>
          <Stat basis={110} value={mine ? mine.rating : RATING_START} label="RATING" />
          <Stat basis={110} tone="lilac" value={mine ? mine.games : 0} label="RANKED GAMES" />
          <Stat basis={110} value={rank >= 0 ? '#' + (rank + 1) : '—'} label="LADDER" />
        </div>
      </Panel>

      <Panel tab="LADDER" tight>
        {ladder.error && <Message tone="error">{ladder.error.toUpperCase()}</Message>}
        <div className={styles.list}>
          {ladder.rows.map((r, i) => (
            <RankRow key={r.user_id} rank={i + 1} name={displayName(r) || 'WORKMATE'} score={r.rating} isSelf={r.user_id === userId} />
          ))}
          {!ladder.loading && !ladder.error && ladder.rows.length === 0 && <div className={styles.empty}>NO RANKED MATCHES YET. BE THE FIRST ON THE LADDER.</div>}
        </div>
      </Panel>
    </>
  );
}
