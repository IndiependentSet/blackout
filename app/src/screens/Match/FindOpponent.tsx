import { useEffect, useState } from 'react';
import { Button, Message, Panel, Tag } from '../../ui';
import { useMatchmaking, type SearchDeps } from './useMatchmaking';
import styles from './Match.module.css';

/** The 1vs1 pool has two tiers: the easier sites and the harder ones. */
const TIERS = [{ tier: 0, label: 'STANDARD SITE' }, { tier: 1, label: 'HARD SITE' }] as const;

interface Props {
  onFound: (matchId: string) => void;
  /** disable the buttons while another request is in flight */
  disabled?: boolean;
  deps?: SearchDeps;
}

/* Matchmaking: look for a stranger to race. The match is ranked, so it moves your rating; a challenge to a
   workmate (below) does not. */
export function FindOpponent({ onFound, disabled, deps }: Props) {
  const { search, start, cancel } = useMatchmaking(onFound, deps);
  const searching = search.status === 'searching';
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (search.status !== 'searching') return;
    const t0 = search.startedAt;
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - t0) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [search]);

  return (
    <Panel tab="FIND AN OPPONENT" tone="orchid">
      <div className={styles.list}>
        <Tag tone="orchid" size="sm">RANKED · MOVES YOUR RATING</Tag>
        {search.status === 'error' && <Message tone="error">{search.message.toUpperCase()}</Message>}
        {search.status === 'timeout' && <div className={styles.empty}>NOBODY ELSE IS LOOKING RIGHT NOW. TRY AGAIN IN A MINUTE, OR CHALLENGE A WORKMATE BELOW.</div>}
        {searching ? (
          <div className={styles.item}>
            <span className={styles.itemName} role="status">LOOKING FOR A WORKMATE… {seconds}S</span>
            <Button size="chip" variant="muted" onClick={cancel}>CANCEL</Button>
          </div>
        ) : (
          <div className={styles.record}>
            {TIERS.map(t => (
              <Button key={t.tier} size="chip" disabled={disabled} onClick={() => start(t.tier)}>{t.label}</Button>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
