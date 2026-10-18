import { isMatchLevel } from '../../domain/match';
import { SITE_COUNT } from '../../domain/sites';
import type { Level } from '../../domain/types';
import { ok, type Result } from '../result';
import { supabase } from '../supabase/client';
import { isMissingTable, toResult } from '../supabase/guard';

/* The published daily week (app/sql/2026-10-21-daily-levels.sql). A scheduled job writes the seven levels of a
   puzzle day at 00:00 GMT; players only read. */

interface Row { idx: number; level: unknown }

/** The day's seven levels in site order, or null when the week isn't (completely, validly) published yet. A
    missing table also means "not published": a deploy can go live a minute before its migration lands. */
export async function getDailyLevels(day: number): Promise<Result<Level[] | null>> {
  const { data, error } = await supabase.from('daily_levels').select('idx, level').eq('day', day).order('idx');
  if (isMissingTable(error)) return ok(null);
  const res = toResult('getDailyLevels', (data || []) as Row[], error);
  if (!res.ok) return res;
  const week: Level[] = [];
  for (let i = 0; i < SITE_COUNT; i++) {
    const row = res.data.find(r => r.idx === i);
    if (!row || !isMatchLevel(row.level)) return ok(null);
    week.push(row.level);
  }
  return ok(week);
}
