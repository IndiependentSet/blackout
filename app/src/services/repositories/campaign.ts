import { scoreRun } from '../../domain/scoring';
import { CAMPAIGN_LEVELS, type CampaignClear, type CampaignStars, type SiteResult, type Stars } from '../../domain/types';
import { ok, type Result } from '../result';
import { supabase } from '../supabase/client';
import { toResult } from '../supabase/guard';

/** A `campaign_clears` row (app/sql/2026-10-10-campaign-clears.sql). */
export interface CampaignClearRow {
  level_no: number;
  cats_used: number;
  par: number;
  stars: number;
  campaign_stars: number;
}

const COLUMNS = 'level_no, cats_used, par, stars, campaign_stars';
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));

/* The score card's breakdown is rebuilt from the stored numbers with the same
   scoreRun() the board uses, so a saved level and a freshly played one look alike. */
export function toCampaignClear(row: CampaignClearRow): CampaignClear {
  const stars = clamp(row.stars, 1, 3) as Stars;
  return {
    levelNo: row.level_no,
    run: scoreRun({ stars, k: row.par }, row.cats_used),
    campaignStars: clamp(row.campaign_stars, 0, 3) as CampaignStars,
  };
}

export async function getCampaignClears(userId: string | null): Promise<Result<CampaignClear[]>> {
  if (!userId) return ok([]);
  const { data, error } = await supabase.from('campaign_clears').select(COLUMNS).eq('user_id', userId);
  const res = toResult('getCampaignClears', (data || []) as CampaignClearRow[], error);
  if (!res.ok) return res;
  return ok(res.data.filter(r => r.level_no >= 1 && r.level_no <= CAMPAIGN_LEVELS).map(toCampaignClear));
}

/* A replay never makes the record worse: the keep-best trigger in the DB keeps
   the fewer cats and the higher campaign stars, whatever this sends. */
export async function recordCampaignClear(
  userId: string, levelNo: number, run: SiteResult, campaignStars: CampaignStars,
): Promise<Result<null>> {
  const { error } = await supabase.from('campaign_clears').upsert({
    user_id: userId, level_no: levelNo, cats_used: run.used, par: run.par,
    stars: run.stars, campaign_stars: campaignStars,
  }, { onConflict: 'user_id,level_no' });
  return toResult('recordCampaignClear', null, error);
}
