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
