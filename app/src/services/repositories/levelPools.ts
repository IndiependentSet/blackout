import { isMatchLevel } from '../../domain/match';
import type { PoolMode } from '../../domain/gameModes';
import type { LevelCurve } from '../../domain/generation';
import type { Level } from '../../domain/types';
import { fail, ok, type Result } from '../result';
import { supabase } from '../supabase/client';
import { toResult } from '../supabase/guard';

/* Published level pools (app/sql/2026-10-20-level-pools.sql). Players only read: the server hands out the
   campaign level for a number and the survival level for a (run seed, step). Only an admin publishes. */

/** One level of a pool, as the publish call takes it. */
export interface PoolEntry { slot: number; tier: number; level: Level }

/** A published pool, without its levels. */
export interface PoolInfo {
  id: number;
  mode: PoolMode;
  version: number;
  note: string;
  levelCount: number;
  createdAt: string;
  /** as stored: the curve that made it */
  curve: unknown;
}

interface PoolRow { id: number; mode: PoolMode; version: number; note: string | null; level_count: number; created_at: string; curve: unknown }

const COLS = 'id, mode, version, note, level_count, created_at, curve';

/** The server answers "no … levels published" until an admin has published a pool for the mode. */
export const isUnpublished = (error: string): boolean => /levels published/i.test(error);

/** What a screen says when its pool is empty. */
export const UNPUBLISHED_COPY = 'NO LEVELS PUBLISHED YET — CHECK BACK SOON';

function asLevel(scope: string, data: unknown): Result<Level> {
  if (isMatchLevel(data)) return ok(data);
  return fail(scope + ': the server sent something that is not a level');
}

export async function getCampaignLevel(levelNo: number): Promise<Result<Level>> {
  const { data, error } = await supabase.rpc('campaign_level', { p_level_no: levelNo });
  const res = toResult('getCampaignLevel', data as unknown, error);
  return res.ok ? asLevel('campaign level ' + levelNo, res.data) : res;
}

export async function getSurvivalLevel(runSeed: string, step: number): Promise<Result<Level>> {
  const { data, error } = await supabase.rpc('survival_level', { p_seed: runSeed, p_step: step });
  const res = toResult('getSurvivalLevel', data as unknown, error);
  return res.ok ? asLevel('survival step ' + step, res.data) : res;
}

const toInfo = (r: PoolRow): PoolInfo => ({
  id: r.id, mode: r.mode, version: r.version, note: r.note ?? '', levelCount: r.level_count, createdAt: r.created_at, curve: r.curve,
});

/** Every published pool of a mode, newest first. */
export async function listPools(mode: PoolMode): Promise<Result<PoolInfo[]>> {
  const { data, error } = await supabase.from('level_pools').select(COLS).eq('mode', mode).order('version', { ascending: false });
  const res = toResult('listPools', (data || []) as PoolRow[], error);
  return res.ok ? ok(res.data.map(toInfo)) : res;
}

/** Publish a pool as the mode's next version (admin only). Answers the version. */
export async function publishPool(mode: PoolMode, curve: LevelCurve, entries: readonly PoolEntry[], note: string): Promise<Result<number>> {
  const { data, error } = await supabase.rpc('publish_level_pool', { p_mode: mode, p_curve: curve, p_levels: entries, p_note: note });
  const res = toResult('publishPool', data as number | null, error);
  if (!res.ok) return res;
  return typeof res.data === 'number' ? ok(res.data) : fail('NO POOL VERSION');
}
