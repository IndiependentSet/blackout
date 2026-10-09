import type { GameMode } from '../../domain/gameModes';
import type { GenerationSchedule } from '../../domain/generation';
import type { StoredConfig } from '../../domain/generationConfig';
import { ok, type Result } from '../result';
import { supabase } from '../supabase/client';
import { isMissingTable, toResult } from '../supabase/guard';

/* Admin-saved level generation (public.generation_configs). Anyone can read
   them — signed-out players generate their week from the one in force — but
   only the admin-checked functions in app/sql/…-admin-generation-config.sql
   can write them. */

const COLS = 'id, mode, effective_from_day, schedule, note, created_at';

interface Row { id: number; mode: GameMode; effective_from_day: number; schedule: unknown; note: string | null; created_at: string }

const toConfig = (r: Row): StoredConfig => ({
  id: r.id, mode: r.mode, effectiveFromDay: r.effective_from_day, schedule: r.schedule, note: r.note ?? '', createdAt: r.created_at,
});

/** Every config for a mode, latest effective day first. */
export async function listConfigs(mode: GameMode): Promise<Result<StoredConfig[]>> {
  const { data, error } = await supabase.from('generation_configs').select(COLS)
    .eq('mode', mode).order('effective_from_day', { ascending: false });
  const res = toResult('listConfigs', (data || []) as Row[], error);
  return res.ok ? ok(res.data.map(toConfig)) : res;
}

/** The config in force for a mode on a day, or null when none has taken effect.
    A missing table also means none: a deploy can go live a minute before its
    migration lands, and with nothing saved the default really is the schedule. */
export async function configInForce(mode: GameMode, day: number): Promise<Result<StoredConfig | null>> {
  const { data, error } = await supabase.from('generation_configs').select(COLS)
    .eq('mode', mode).lte('effective_from_day', day).order('effective_from_day', { ascending: false }).limit(1);
  if (isMissingTable(error)) return ok(null);
  const res = toResult('configInForce', (data || []) as Row[], error);
  return res.ok ? ok(res.data[0] ? toConfig(res.data[0]) : null) : res;
}

/** Save (or replace) a mode's config from a future day on. Answers the row id. */
export async function saveConfig(mode: GameMode, effectiveFromDay: number, schedule: GenerationSchedule, note: string): Promise<Result<number>> {
  const { data, error } = await supabase.rpc('save_generation_config', {
    p_mode: mode, p_effective_from_day: effectiveFromDay, p_schedule: schedule, p_note: note,
  });
  return toResult('saveConfig', data as number, error);
}

/** Cancel a config that hasn't taken effect yet. */
export async function deleteConfig(id: number): Promise<Result<null>> {
  const { error } = await supabase.rpc('delete_generation_config', { p_id: id });
  return toResult('deleteConfig', null, error);
}
