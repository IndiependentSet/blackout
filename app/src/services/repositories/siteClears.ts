import { ok, type Result } from '../result';
import { supabase } from '../supabase/client';
import { toResult } from '../supabase/guard';

/* stars is the level's own difficulty rating (domain/generation's difficulty(), 1-3).
   The leaderboard score itself is computed in the DB from stars and how far
   catsUsed landed from par (see app/sql/…-weighted-score.sql). */
export async function recordClear(
  userId: string, dayNumber: number, siteIndex: number, catsUsed: number, par: number, stars: number,
): Promise<Result<null>> {
  const { error } = await supabase.from('site_clears').upsert({
    user_id: userId, day_number: dayNumber, site_index: siteIndex,
    cats_used: catsUsed, par, stars, on_budget: catsUsed <= par,
  }, { onConflict: 'user_id,day_number,site_index' });
  return toResult('recordClear', null, error);
}

export async function getAllTimeCount(userId: string | null): Promise<Result<number>> {
  if (!userId) return ok(0);
  const { count, error } = await supabase.from('site_clears')
    .select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('on_budget', true);
  return toResult('getAllTimeCount', count || 0, error);
}
