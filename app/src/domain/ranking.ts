/* The shape of a leaderboard, whichever mode it belongs to. `board_rows` in app/sql/2026-10-30-leaderboards.sql is the
   authority: it measures, orders and ranks every board (the header of that file says how each one breaks a tie); this
   module only gives its rows a type and cuts them into what a page shows. Pure. */

/** Which board: one night's points, the last seven nights, every night ever, voyage stars, Meteor Rush runs, the ranked duel ladder, and this month's rating gained in ranked duels. */
export type BoardKind = 'night' | 'week' | 'alltime' | 'voyage' | 'rush' | 'duel' | 'season';

/** The boards only a signed-in player may read (the server refuses the rest of the world). */
export const SIGNED_IN_BOARDS: readonly BoardKind[] = ['duel', 'season'];

/** Whose board: the player's fellow stargazers (and themself), or every player. */
export type Audience = 'friends' | 'everyone';

/** how many rows a board lists before the player's own row is pinned under it */
export const BOARD_ROWS = 20;

/** ranked duels a player needs before they stand on the ladder (`board_scored` in the SQL says the same) */
export const LADDER_MIN_GAMES = 5;

/** ranked duels in a month before a player stands on that month's board */
export const SEASON_MIN_GAMES = 3;

/** rows of the ladder listed from the top, and how many either side of the player (the "around you" window) */
export const LADDER_TOP = 3;
export const LADDER_AROUND = 3;

/** A row as `board_rows` answers it. */
export interface BoardRowData {
  place: number;
  total: number;
  user_id: string;
  username: string | null;
  avatar: string | null;
  value: number;
  extra: number;
  is_me: boolean;
  /** the duel board: rating change over the caller's last five ranked duels */
  trend?: number | null;
  /** the duel and season boards: the caller's finished duels won and lost against this player */
  won_vs?: number | null;
  lost_vs?: number | null;
}

/** One player on a board. `value` is the board's first measure and `extra` its second (par count, levels, points, games). */
export interface BoardEntry {
  place: number;
  userId: string;
  username: string | null;
  avatar: string | null;
  value: number;
  extra: number;
  isMe: boolean;
  /** rating change over the last five ranked duels; null off the duel board */
  trend: number | null;
  /** the caller's record against this player; null on the caller's own row and off the duel boards */
  versus: { won: number; lost: number } | null;
}

/** The rows asked for, in order (the caller's own among them when they were below the cut), and everyone on the board. */
export interface Board {
  entries: BoardEntry[];
  total: number;
}

export function toBoard(rows: readonly BoardRowData[]): Board {
  return {
    total: rows.length > 0 ? rows[0].total : 0,
    entries: rows.map(r => ({
      place: r.place, userId: r.user_id, username: r.username, avatar: r.avatar, value: r.value, extra: r.extra, isMe: r.is_me,
      trend: r.trend ?? null, versus: r.won_vs == null || r.lost_vs == null ? null : { won: r.won_vs, lost: r.lost_vs },
    })),
  };
}

/** The player's own row, if they are on the board. */
export const mineOf = (board: Board): BoardEntry | null => board.entries.find(e => e.isMe) ?? null;

/** What a page lists: the first `limit` rows, how many players sit between them and the player's pinned row. */
export function windowOf(board: Board, limit: number = BOARD_ROWS): { top: BoardEntry[]; hidden: number } {
  const top = board.entries.slice(0, limit);
  const me = mineOf(board);
  const pinned = me !== null && !top.includes(me);
  return { top, hidden: pinned ? Math.max(0, board.total - top.length - 1) : 0 };
}

/** "#47 of 312" */
export const placeText = (e: Pick<BoardEntry, 'place'>, total: number): string => `#${e.place} of ${total}`;

/** What a row of a rival says about the caller's record against them: "You lead 4–2", "They lead 3–1", "Level 2–2"; null before any duel. */
export function versusText(v: BoardEntry['versus']): string | null {
  if (!v || v.won + v.lost === 0) return null;
  return v.won > v.lost ? `You lead ${v.won}–${v.lost}` : v.lost > v.won ? `They lead ${v.lost}–${v.won}` : `Level ${v.won}–${v.lost}`;
}

/** The rows of a window in order, with a `gap` wherever rows were left out between them. Tied rows share a place (1, 1, 3),
    so the place that follows is the last one's plus how many shared it. */
export function withGaps(entries: readonly BoardEntry[]): (BoardEntry | 'gap')[] {
  const out: (BoardEntry | 'gap')[] = [];
  let expected = 0;
  entries.forEach((e, i) => {
    if (i > 0 && e.place > expected) out.push('gap');
    expected = e.place === entries[i - 1]?.place ? expected + 1 : e.place + 1;
    out.push(e);
  });
  return out;
}
