import type { EarnedBadge } from '../../domain/badges';
import { ok, type Result } from '../result';
import { supabase } from '../supabase/client';
import { toResult } from '../supabase/guard';

interface BadgeRow { badge_id: string; earned_at: string }

/** The badges a player holds, oldest first, from `player_badges` (app/sql/2026-10-16-badges.sql). Read-only: the server awards them. */
export async function listBadgesOf(userId: string): Promise<Result<EarnedBadge[]>> {
  const { data, error } = await supabase.from('player_badges')
    .select('badge_id, earned_at').eq('user_id', userId).order('earned_at', { ascending: true });
  const res = toResult('listBadgesOf', data as BadgeRow[] | null, error);
  if (!res.ok) return res;
  return ok((res.data ?? []).map(r => ({ id: r.badge_id, earnedAt: r.earned_at })));
}

/** The signed-in player's own badges; nobody signed in has none and the db isn't asked. */
export const listMyBadges = (userId: string | null): Promise<Result<EarnedBadge[]>> =>
  userId ? listBadgesOf(userId) : Promise.resolve(ok([]));
