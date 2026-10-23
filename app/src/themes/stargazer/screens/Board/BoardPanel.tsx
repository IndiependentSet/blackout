import { LADDER_AROUND, LADDER_MIN_GAMES, LADDER_TOP, SEASON_MIN_GAMES, SIGNED_IN_BOARDS, type BoardKind } from '../../../../domain/ranking';
import { useBoard } from '../../../../game/hooks/useBoard';
import { useLadderProgress } from '../../../../game/hooks/useLadderProgress';
import { Button } from '../../kit/Button';
import { Leaderboard } from '../../kit/Leaderboard';
import { Note } from '../../kit/Page';
import { BOARDS, ladderProgressText, seasonText } from '../../copy';

interface Props {
  kind: BoardKind;
  userId: string | null;
  /** the night a night or week board ends on, and the season a season board is of */
  day?: number;
  limit?: number;
  /** hold the read off until it is true (the Rush board waits for the run to be banked) */
  enabled?: boolean;
  heading?: boolean;
  onSignIn?: () => void;
  /** a fellow stargazer's row on a duel board offers this */
  onChallenge?: (friendId: string) => void;
  challengeBusy?: boolean;
}

/* One leaderboard on a page: reads it (`useBoard`) and draws it (`Leaderboard`). Every mode's board goes through here,
   so a board reads and looks the same wherever the player finds it. The two duel boards are the ladder's: they list the
   top few and the players around the reader, say how far a newcomer is from standing on them, and let a fellow
   stargazer be challenged from their row. */
export function BoardPanel({ kind, userId, day, limit, enabled = true, heading, onSignIn, onChallenge, challengeBusy }: Props) {
  const ladder = kind === 'duel' || kind === 'season';
  const locked = SIGNED_IN_BOARDS.includes(kind) && !userId;
  const state = useBoard({
    kind, userId, day, enabled: enabled && !locked,
    limit: ladder ? LADDER_TOP : limit, around: ladder ? LADDER_AROUND : undefined,
  });
  const progress = useLadderProgress(userId, ladder);

  if (locked) {
    return (
      <>
        <Note>The {BOARDS[kind].title.toLowerCase()} board is for signed-in stargazers.</Note>
        {onSignIn && <Button kind="soft" size="sm" onClick={onSignIn}>Sign in</Button>}
      </>
    );
  }

  const games = progress ? (kind === 'season' ? progress.seasonGames : progress.games) : null;
  const min = kind === 'season' ? SEASON_MIN_GAMES : LADDER_MIN_GAMES;
  const joinText = ladder && games !== null && games < min ? ladderProgressText(games, min, kind === 'season' ? 'this month' : 'on the ladder') : undefined;

  return (
    <Leaderboard kind={kind} board={state.board} loading={state.loading} error={state.error} audience={state.audience}
      hasFriends={state.hasFriends} onAudience={state.setAudience} signedIn={!!userId} onSignIn={onSignIn} limit={ladder ? LADDER_TOP : limit}
      heading={heading} around={ladder} note={kind === 'season' && day !== undefined ? seasonText(day) : undefined} joinText={joinText}
      challengeable={onChallenge ? state.friendIds : undefined} onChallenge={onChallenge ? e => onChallenge(e.userId) : undefined} challengeBusy={challengeBusy} />
  );
}
