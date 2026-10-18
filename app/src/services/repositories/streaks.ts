import type { Streak } from '../../domain/types';
import { ok, type Result } from '../result';
import { supabase } from '../supabase/client';
import { toResult } from '../supabase/guard';

export const NO_STREAK: Streak = { current: 0, best: 0 };

interface StreakRow { current_streak: number | null; best_streak: number | null }

/** The player's daily streak, from the `player_streaks` view (app/sql/2026-10-09-player-streaks.sql). No row means no clears yet. */
export async function getStreak(userId: string | null): Promise<Result<Streak>> {
  if (!userId) return ok(NO_STREAK);
  const { data, error } = await supabase.from('player_streaks')
    .select('current_streak, best_streak').eq('user_id', userId).maybeSingle();
  const res = toResult('getStreak', data as StreakRow | null, error);
  if (!res.ok) return res;
  const row = res.data;
  return ok(row ? { current: Number(row.current_streak) || 0, best: Number(row.best_streak) || 0 } : NO_STREAK);
}
