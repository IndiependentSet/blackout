import type { RunSummary, SurvivalBoardRow } from '../../domain/survival';
import { fail, ok, type Result } from '../result';
import { supabase } from '../supabase/client';
import { toResult } from '../supabase/guard';

const BOARD_COLUMNS = 'user_id, username, sites, perfect, score';
const BOARD_LIMIT = 5;

interface RunRow { sites: number | null; perfect: number | null; score: number | null }

const toSummary = (row: RunRow): RunSummary => ({
  sites: Number(row.sites) || 0, perfect: Number(row.perfect) || 0, score: Number(row.score) || 0,
});

/* The server opens the run and stamps its clock (app/sql/2026-10-14-survival-runs.sql); the client only keeps the id.
   The seed names the run to the level pool, which is how the server knows every site the run is shown. */
export async function startSurvivalRun(seed: string): Promise<Result<string>> {
  const { data, error } = await supabase.rpc('start_survival_run', { p_seed: seed });
  const res = toResult('startSurvivalRun', data as string | null, error);
  if (!res.ok) return res;
  return typeof res.data === 'string' ? ok(res.data) : fail('NO SURVIVAL RUN ID');
}

/* Bank one cleared site. The server derives the level from the run (app/sql/2026-10-20-level-pools.sql), checks the cats
   against it and against its clock; the reply is the run so far. */
export async function submitSurvivalSite(runId: string, step: number, nodes: number[]): Promise<Result<RunSummary>> {
  const { data, error } = await supabase.rpc('submit_survival_site', { p_run_id: runId, p_step: step, p_nodes: nodes });
  const res = toResult('submitSurvivalSite', data as RunRow | null, error);
  if (!res.ok) return res;
  return res.data ? ok(toSummary(res.data)) : fail('NO SURVIVAL REPLY');
}

/** Each player's best run, best first. */
export async function getSurvivalLeaderboard(limit: number = BOARD_LIMIT): Promise<Result<SurvivalBoardRow[]>> {
  const { data, error } = await supabase.from('leaderboard_survival').select(BOARD_COLUMNS)
    .order('sites', { ascending: false }).order('score', { ascending: false }).limit(limit);
  const res = toResult('getSurvivalLeaderboard', (data || []) as SurvivalBoardRow[], error);
  if (!res.ok) return res;
  return ok(res.data.map(r => ({ ...r, ...toSummary(r) })));
}

/** The player's best run on the server, null before their first site. */
export async function getBestRun(userId: string | null): Promise<Result<RunSummary | null>> {
  if (!userId) return ok(null);
  const { data, error } = await supabase.from('leaderboard_survival').select(BOARD_COLUMNS)
    .eq('user_id', userId).maybeSingle();
  const res = toResult('getBestRun', data as RunRow | null, error);
  if (!res.ok) return res;
  return ok(res.data ? toSummary(res.data) : null);
}
