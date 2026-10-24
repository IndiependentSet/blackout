import { checkFigure, parseFigure } from '../../domain/generation';
import type { SkyFigure } from '../../domain/types';
import { logger } from '../logger';
import { fail, ok, type Result } from '../result';
import { supabase } from '../supabase/client';
import { isMissingTable, toResult } from '../supabase/guard';

/* Hand-drawn skies pinned to one site of one future Tonight (public.daily_manual_levels). Admins only: players can
   never read them (a future puzzle must not leak), and the daily job reads the table as the service role and plays
   them in place of the generated sites. Written only through the admin-checked functions in
   app/sql/…-daily-manual-levels.sql. */

/** One pinned sky: the drawing, for the editor (its level is worked out again from it, never trusted from storage). */
export interface PinnedSky { day: number; idx: number; figure: SkyFigure; note: string }

interface Row { day: number; idx: number; figure: unknown; note: string | null }

/* PostgREST's "function not found": the migration has not landed yet */
const MISSING_FUNCTION = 'PGRST202';

/** The pinned skies from today on, by day and site. A drawing that no longer parses is left out (and logged); a
    missing function reads as none. */
export async function listPinnedSkies(): Promise<Result<PinnedSky[]>> {
  const { data, error } = await supabase.rpc('list_daily_manual_levels');
  if (isMissingTable(error) || error?.code === MISSING_FUNCTION) return ok([]);
  const res = toResult('listPinnedSkies', (data || []) as Row[], error);
  if (!res.ok) return res;
  const out: PinnedSky[] = [];
  for (const r of res.data) {
    const fig = parseFigure(r.figure);
    if (fig.ok) out.push({ day: r.day, idx: r.idx, figure: fig.value, note: r.note ?? '' });
    else logger.error('listPinnedSkies', { message: `day ${r.day} sky ${r.idx}: the drawing does not parse: ${fig.errors.join('; ')}` });
  }
  return ok(out);
}

/** Pin a drawing to a future day's site (replacing what was pinned there). Refused here unless it is a playable sky. */
export async function pinSky(day: number, idx: number, figure: SkyFigure, note = ''): Promise<Result<null>> {
  const { level, playable, errors, optima } = checkFigure(figure);
  if (!level || !playable) return fail(errors[0] ?? `${optima} best answers: the game needs exactly one`);
  const { _score, ...clean } = level;
  const { error } = await supabase.rpc('save_daily_manual_level', { p_day: day, p_idx: idx, p_level: clean, p_figure: figure, p_note: note });
  return toResult('pinSky', null, error);
}

/** Take a pinned sky away; that site is generated again. */
export async function unpinSky(day: number, idx: number): Promise<Result<null>> {
  const { error } = await supabase.rpc('delete_daily_manual_level', { p_day: day, p_idx: idx });
  return toResult('unpinSky', null, error);
}
