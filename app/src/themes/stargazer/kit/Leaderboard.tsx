import { displayName } from '../../../domain/profile';
import { BOARD_ROWS, mineOf, placeText, versusText, windowOf, withGaps, type Audience, type Board, type BoardEntry, type BoardKind } from '../../../domain/ranking';
import { BOARDS } from '../copy';
import { Button } from './Button';
import { Scroll } from './Layout';
import { Note } from './Page';
import { Pills } from './Pills';
import { cx } from './cx';
import styles from './Leaderboard.module.css';

export interface LeaderboardProps {
  kind: BoardKind;
  board: Board | undefined;
  loading: boolean;
  error: string | null;
  audience: Audience;
  /** the player has fellow stargazers, so there is a second audience to switch to */
  hasFriends: boolean;
  onAudience: (a: Audience) => void;
  signedIn: boolean;
  onSignIn?: () => void;
  /** rows listed before the player's own is pinned under the list */
  limit?: number;
  /** the board's own title above its rule, for a page with no title of its own */
  heading?: boolean;
  /** the rows are the top few and the ones around the player (the ladder): list them all, with a gap where rows are left out */
  around?: boolean;
  /** one more line under the rule: how long a season has left */
  note?: string;
  /** what to tell a signed-in player who is not on the board, instead of the board's own line (their progress toward it) */
  joinText?: string;
  /** a row of one of these players (fellow stargazers) offers to challenge them */
  challengeable?: ReadonlySet<string>;
  onChallenge?: (entry: BoardEntry) => void;
  challengeBusy?: boolean;
}

/** "▲ 24" / "▼ 9": which way a player's rating has been moving; nothing when it has not moved. */
function Trend({ value }: { value: number | null }) {
  if (!value) return null;
  return <i className={cx(styles.trend, value > 0 ? styles.up : styles.down)} aria-label={`${value > 0 ? 'up' : 'down'} ${Math.abs(value)} over the last five duels`}>{value > 0 ? '▲' : '▼'} {Math.abs(value)}</i>;
}

/* A leaderboard, drawn: its rule, an audience switch, the list in its own scrolling panel, and the player's place
   pinned under it, so it stays in view however far down they are. Nothing here reads data: `useBoard` does. */
export function Leaderboard({
  kind, board, loading, error, audience, hasFriends, onAudience, signedIn, onSignIn, limit = BOARD_ROWS, heading, around,
  note, joinText, challengeable, onChallenge, challengeBusy,
}: LeaderboardProps) {
  const copy = BOARDS[kind];
  const win = board ? windowOf(board, limit) : null;
  const mine = board ? mineOf(board) : null;
  const items = board ? (around ? withGaps(board.entries) : win?.top ?? []) : [];
  const rowText = (e: BoardEntry) => <><b>{copy.value(e.value)}{kind === 'duel' && <Trend value={e.trend} />}</b><span>{copy.extra(e.extra)}</span></>;

  return (
    <>
      {heading && <h2 className={styles.title}>{copy.title}</h2>}
      <p className={styles.rule}>{copy.rule}{note && <> <b>{note}</b></>}</p>
      {signedIn && hasFriends && (
        <Pills label="Whose board" value={audience} onChange={onAudience}
          items={[{ id: 'friends', label: 'Fellow stargazers' }, { id: 'everyone', label: 'Everyone' }]} />
      )}
      {error ? <Note tone="error">Couldn’t read the board. {error}</Note>
        : !board || loading ? <Note>Reading the board…</Note>
        : board.total === 0 ? <Note>{audience === 'friends' ? 'None of your fellow stargazers are on this board yet.' : copy.empty}</Note>
        : (
          <Scroll label={copy.title + ' leaderboard'}>
            <ol className={styles.list}>
              {items.map((e, i) => {
                if (e === 'gap') return <li key={'gap' + i} className={styles.gap} aria-hidden="true">⋯</li>;
                const versus = e.isMe ? null : versusText(e.versus);
                return (
                  <li key={e.userId} className={cx(styles.row, e.isMe && styles.mine)}>
                    <span className={styles.place}>{e.place}</span>
                    <span className={styles.who}>
                      <span className={styles.name}>{displayName(e) || 'Stargazer'}{e.isMe ? ' (you)' : ''}</span>
                      {versus && <span className={styles.versus}>{versus}</span>}
                    </span>
                    <span className={styles.figures}>{rowText(e)}</span>
                    {onChallenge && challengeable?.has(e.userId) && !e.isMe && (
                      <Button kind="soft" size="sm" disabled={challengeBusy} onClick={() => onChallenge(e)} aria-label={`Challenge ${displayName(e)}`}>Challenge</Button>
                    )}
                  </li>
                );
              })}
              {!around && win && win.hidden > 0 && <li className={styles.gap} aria-hidden="true">⋯</li>}
            </ol>
          </Scroll>
        )}
      {!error && board && (
        mine ? (
          <div className={cx(styles.row, styles.mine, styles.pinned)} aria-label="your place">
            <span className={styles.who}><span className={styles.name}>You · {placeText(mine, board.total)}</span></span>
            <span className={styles.figures}>{rowText(mine)}</span>
          </div>
        ) : signedIn ? (board.total > 0 || joinText ? <Note>{joinText ?? copy.join}</Note> : null)
          : onSignIn ? <Button kind="soft" size="sm" onClick={onSignIn}>Sign in to see your place</Button>
          : <Note>Sign in to see your place.</Note>
      )}
    </>
  );
}
