import { matchOutcome } from '../../domain/match';
import { formatClock } from '../../domain/survival';
import type { MatchPlayer, MatchView } from '../../domain/types';
import { Button, cx } from '../../ui';
import styles from './Match.module.css';

interface Props {
  view: MatchView;
  userId: string;
  opponentName: string;
  onOpenLobby: () => void;
  onOpenHub: () => void;
}

const TITLE = { won: 'YOU WON', lost: 'YOU LOST', drawn: 'DEAD HEAT', void: 'NO CONTEST', open: '' } as const;
const NOTE = {
  won: 'Your crew flattened it first, with the fewest cats.',
  lost: 'Their crew got there ahead of you.',
  drawn: 'Same cats, same moment. Nobody wins.',
  void: 'The challenge was called off, or nobody cleared the site in time.',
  open: '',
} as const;

/* How long after the countdown the player's best clear came in, as "1:07"; a dash if they never cleared it. */
function clearTime(p: MatchPlayer | undefined, startsAt: string | null): string {
  if (!p || p.cats_used === null || p.finished_at === null || startsAt === null) return '—';
  return formatClock(Date.parse(p.finished_at) - Date.parse(startsAt));
}

function Line({ name, player, startsAt, winner }: { name: string; player: MatchPlayer | undefined; startsAt: string | null; winner: boolean }) {
  const cats = player && player.cats_used !== null ? player.cats_used + (player.cats_used === 1 ? ' CAT' : ' CATS') : 'NO CLEAR';
  return (
    <div className={cx(styles.row, winner && styles.winner)}>
      <span>{name}{winner ? ' ★' : ''}</span>
      <span>{cats} · {clearTime(player, startsAt)}</span>
    </div>
  );
}

/* The sheet that closes a match: who won, and each side's best clear. */
export function MatchResult({ view, userId, opponentName, onOpenLobby, onOpenHub }: Props) {
  const { match, players } = view;
  const outcome = matchOutcome(match, userId);
  const mine = players.find(p => p.user_id === userId);
  const theirs = players.find(p => p.user_id !== userId);

  return (
    <div className={styles.scrim}>
      <div className={styles.card} role="dialog" aria-label="match result">
        <div className={cx(styles.cardHead, outcome === 'won' && styles.won, outcome === 'lost' && styles.lost)}>
          <span className={styles.order}>1VS1 · PAR {match.level.k} CATS</span>
          <span className={styles.title}>{TITLE[outcome]}</span>
        </div>
        <div className={styles.cardBody}>
          {outcome !== 'void' && (
            <>
              <Line name="YOU" player={mine} startsAt={match.starts_at} winner={outcome === 'won'} />
              <Line name={opponentName || 'OPPONENT'} player={theirs} startsAt={match.starts_at} winner={outcome === 'lost'} />
            </>
          )}
          <p className={styles.line}>{NOTE[outcome]}</p>
        </div>
        <div className={styles.actions}>
          <Button variant="glass" size="chip" onClick={onOpenHub}>DASHBOARD</Button>
          <Button variant="primary" onClick={onOpenLobby} style={{ flex: 1 }}>BACK TO LOBBY</Button>
        </div>
      </div>
    </div>
  );
}
