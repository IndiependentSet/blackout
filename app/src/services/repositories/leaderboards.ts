import { BOARD_ROWS, toBoard, type Board, type BoardKind, type BoardRowData } from '../../domain/ranking';
import type { BoardRow, BoardScope, PlayerScore, Profile } from '../../domain/types';
import { ok, type Result } from '../result';
import { supabase } from '../supabase/client';
import { toResult } from '../supabase/guard';

const LEADERBOARD_LIMIT = 20;

export type LeaderboardRow = Profile & { user_id: string; score: number };

export async function getLeaderboard(scope: BoardScope): Promise<Result<LeaderboardRow[]>> {
  const view = scope === 'week' ? 'leaderboard_weekly' : 'leaderboard_alltime';
  const { data, error } = await supabase.from(view).select('*')
    .order('score', { ascending: false }).limit(LEADERBOARD_LIMIT);
  return toResult('getLeaderboard', (data || []) as LeaderboardRow[], error);
}

/* The player_scores view filtered by an id list, so friends/squad boards and
   head-to-head use the same arithmetic as the global leaderboard views. */
export async function getScores(userIds: string[]): Promise<Result<PlayerScore[]>> {
  if (!userIds.length) return ok([]);
  const { data, error } = await supabase.from('player_scores').select('*').in('user_id', userIds);
  return toResult('getScores', (data || []) as PlayerScore[], error);
}

const NO_SCORE = (userId: string): PlayerScore => ({ user_id: userId, name: '', score: 0, week_score: 0 });

export async function getPlayerScore(userId: string): Promise<Result<PlayerScore>> {
  const res = await getScores([userId]);
  return res.ok ? ok(res.data[0] || NO_SCORE(userId)) : res;
}

export async function getBoardFor(userIds: string[], scope: BoardScope): Promise<Result<BoardRow[]>> {
  const res = await getScores(userIds);
  if (!res.ok) return res;
  const key = scope === 'week' ? 'week_score' : 'score';
  return ok(res.data
    .map(r => ({ user_id: r.user_id, name: r.name, score: r[key] || 0 }))
    .sort((a, b) => b.score - a.score));
}

export interface BoardQuery {
  /** the night a night or week board ends on (tonight when left out) */
  day?: number;
  /** narrows the board to these players: a player's friends and themself */
  ids?: string[];
  /** rows to list from the top; 0 reads only the caller's own row (their place and the size of the board) */
  limit?: number;
  /** also list this many rows either side of the caller's own (the ladder's "around you") */
  around?: number;
}

/* One read for every Stargazer board (`board_rows`, app/sql/2026-10-30-leaderboards.sql): the server measures, orders
   and ranks, and adds the caller's own row when it is below the cut. */
export async function getBoard(kind: BoardKind, { day, ids, limit = BOARD_ROWS, around }: BoardQuery = {}): Promise<Result<Board>> {
  const args: Record<string, unknown> = { p_board: kind, p_limit: limit };
  if (day !== undefined) args.p_day = day;
  if (ids) args.p_ids = ids;
  if (around !== undefined) args.p_around = around;
  const { data, error } = await supabase.rpc('board_rows', args);
  const res = toResult('getBoard', (data || []) as BoardRowData[], error);
  return res.ok ? ok(toBoard(res.data)) : res;
}

/** How far a player is from standing on the ladder: ranked duels played ever, and this month. */
export interface LadderProgress { games: number; seasonGames: number }

/** The signed-in player's ranked duels so far (`ladder_progress`, app/sql/2026-11-01-duel-ladder.sql). */
export async function getLadderProgress(): Promise<Result<LadderProgress>> {
  const { data, error } = await supabase.rpc('ladder_progress');
  const res = toResult('getLadderProgress', (data ?? null) as { games: number; season_games: number } | { games: number; season_games: number }[] | null, error);
  if (!res.ok) return res;
  const row = Array.isArray(res.data) ? res.data[0] : res.data;
  return ok({ games: Number(row?.games) || 0, seasonGames: Number(row?.season_games) || 0 });
}
