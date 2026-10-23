import { parseStats, type PlayerStats } from '../../domain/stats';
import { ok, type Result } from '../result';
import { supabase } from '../supabase/client';
import { toResult } from '../supabase/guard';

/** The signed-in player's own numbers in one read (`player_stats`, app/sql/2026-10-31-player-stats.sql). */
export async function getPlayerStats(): Promise<Result<PlayerStats>> {
  const { data, error } = await supabase.rpc('player_stats');
  const res = toResult('getPlayerStats', data as unknown, error);
  return res.ok ? ok(parseStats(res.data)) : res;
}
