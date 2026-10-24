import type { ClearRow } from '../../domain/nights';
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

interface NightRow { day_number: number; site_index: number; on_budget: boolean }

/** The player's clears between two days (inclusive), for the moon calendars. */
export async function getClearsBetween(userId: string | null, fromDay: number, toDay: number): Promise<Result<ClearRow[]>> {
  if (!userId) return ok([]);
  const { data, error } = await supabase.from('site_clears')
    .select('day_number, site_index, on_budget').eq('user_id', userId).gte('day_number', fromDay).lte('day_number', toDay);
  const res = toResult('getClearsBetween', (data ?? []) as NightRow[], error);
  return res.ok ? ok(res.data.map(r => ({ day: r.day_number, site: r.site_index, perfect: !!r.on_budget }))) : res;
}

/** A stored clear: what scoreRun needs to rebuild the result. */
export interface StoredClear { site: number; used: number; par: number; stars: number }

interface StoredRow { site_index: number; cats_used: number; par: number; stars: number }

/** The player's clears for one day, to put tonight's board back after a reload. */
export async function getDayClears(userId: string | null, day: number): Promise<Result<StoredClear[]>> {
  if (!userId) return ok([]);
  const { data, error } = await supabase.from('site_clears')
    .select('site_index, cats_used, par, stars').eq('user_id', userId).eq('day_number', day);
  const res = toResult('getDayClears', (data ?? []) as StoredRow[], error);
  return res.ok ? ok(res.data.map(r => ({ site: r.site_index, used: r.cats_used, par: r.par, stars: r.stars }))) : res;
}
