import { matchOutcome } from '../../../../domain/match';
import { ratingChange, signed } from '../../../../domain/rating';
import { placeText } from '../../../../domain/ranking';
import { formatClock } from '../../../../domain/survival';
import type { MatchPlayer, MatchView } from '../../../../domain/types';
import { useMyPlace } from '../../../../game/hooks/useBoard';
import { Button } from '../../kit/Button';
import { Figure } from '../../kit/Figure';
import { Fit, Split } from '../../kit/Layout';
import { DeskPage } from '../../kit/DeskPage';
import { Eyebrow } from '../../kit/Page';
import { cx } from '../../kit/cx';
import { plural } from '../../copy';
import styles from './Duel.module.css';

interface Props {
  view: MatchView;
  userId: string;
  opponentName: string;
  onOpenLobby: () => void;
  onOpenHub: () => void;
}

const TITLE = { won: 'You won the duel.', lost: 'They won this one.', drawn: 'A perfect tie.', void: 'No duel this time.', open: '' } as const;
const NOTE = {
  won: 'Fewer stars, or the same and faster.',
  lost: 'They showed the whole figure with fewer stars, or got there first.',
  drawn: 'Same stars, same moment.',
  void: 'The challenge was called off, or nobody showed the whole figure in time.',
  open: '',
} as const;

function clearTime(p: MatchPlayer | undefined, startsAt: string | null): string {
  if (!p || p.cats_used === null || p.finished_at === null || startsAt === null) return '—';
  return formatClock(Date.parse(p.finished_at) - Date.parse(startsAt));
}

function Line({ name, player, startsAt, winner }: { name: string; player: MatchPlayer | undefined; startsAt: string | null; winner: boolean }) {
  return (
    <div className={cx(styles.line, winner && styles.lineWin)}>
      <span>{name}{winner ? ' ★' : ''}</span>
      <span>{player && player.cats_used !== null ? plural(player.cats_used, 'star') : 'not charted'} · {clearTime(player, startsAt)}</span>
    </div>
  );
}

/* How a duel ended: who won, each side's stars and time, and the rating it moved. */
export function DuelResult({ view, userId, opponentName, onOpenLobby, onOpenHub }: Props) {
  const { match, players } = view;
  const outcome = matchOutcome(match, userId);
  const mine = players.find(p => p.user_id === userId);
  const theirs = players.find(p => p.user_id !== userId);
  const rating = ratingChange(mine);
  const place = useMyPlace('duel', userId, { enabled: match.ranked, refresh: match.id });
  return (
    <DeskPage active="duel" tone="duel">
      <Split
        before={<>
          <Eyebrow>Star Duel · {match.ranked ? 'ranked · ' : ''}par {match.level.k}</Eyebrow>
          <h1 className={styles.resultTitle}>{TITLE[outcome]}</h1>
        </>}
        lead={<Fit max={260}><Figure figure={match.level} mode="lit" lit={match.level.sol} /></Fit>}
        after={<>
          {outcome !== 'void' && (
            <div className={styles.lines}>
              <Line name="You" player={mine} startsAt={match.starts_at} winner={outcome === 'won'} />
              <Line name={opponentName} player={theirs} startsAt={match.starts_at} winner={outcome === 'lost'} />
            </div>
          )}
          {rating && <div className={styles.line} aria-label="rating change"><span>Rating</span><span>{rating.before} → {rating.after} ({signed(rating.delta)})</span></div>}
          {rating && place && <div className={styles.line} aria-label="ladder place"><span>Ladder</span><span>{placeText(place.entry, place.total)}</span></div>}
          <p className={styles.lead}>{NOTE[outcome]}</p>
          <div className={styles.resultActions}>
            <Button block kind="mint" onClick={onOpenLobby}>Back to the lobby</Button>
            <Button block kind="ghost" size="md" onClick={onOpenHub}>Tonight</Button>
          </div>
        </>} />
    </DeskPage>
  );
}
