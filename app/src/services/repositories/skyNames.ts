import type { SkyFigure, SkyName } from '../../domain/types';
import { ok, type Result } from '../result';
import { supabase } from '../supabase/client';
import { isMissingTable, toResult } from '../supabase/guard';

interface Row { day_number: number; name: string; figure: SkyFigure }

/* The player's named constellations (app/sql/2026-10-25-sky-names.sql). Only their own rows are readable.
   No user, or the table not there yet, reads as an empty atlas. */
export async function listSkyNames(userId: string | null): Promise<Result<SkyName[]>> {
  if (!userId) return ok([]);
  const { data, error } = await supabase.from('sky_names')
    .select('day_number, name, figure').eq('user_id', userId).order('day_number', { ascending: false });
  if (error && isMissingTable(error)) return ok([]);
  const res = toResult('listSkyNames', (data ?? []) as Row[], error);
  return res.ok ? ok(res.data.map(r => ({ day: r.day_number, name: r.name, figure: r.figure }))) : res;
}

/** Name (or rename) a night's constellation. */
export async function nameSky(userId: string, day: number, name: string, figure: SkyFigure): Promise<Result<null>> {
  const { error } = await supabase.from('sky_names').upsert(
    { user_id: userId, day_number: day, name: name.trim(), figure },
    { onConflict: 'user_id,day_number' });
  return toResult('nameSky', null, error);
}
