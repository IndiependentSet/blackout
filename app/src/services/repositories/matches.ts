import { isMatchLevel } from '../../domain/match';
import type { Level, Match, MatchPlayer, MatchRecord, MatchView } from '../../domain/types';
import { fail, ok, type Result } from '../result';
import { supabase } from '../supabase/client';
import { toResult } from '../supabase/guard';

const MY_MATCHES_LIMIT = 20;

type MatchRow = Omit<Match, 'level'> & { level: unknown };
type ViewRow = MatchRow & { match_players: MatchPlayer[] | null };

/* The graph arrives as plain JSON: a row whose `level` is not a real level is dropped rather than drawn. */
export function toMatch(row: MatchRow | null | undefined): Match | null {
  return row && isMatchLevel(row.level) ? { ...row, level: row.level } : null;
}

function toView(row: ViewRow): MatchView | null {
  const { match_players: players, ...rest } = row;
  const match = toMatch(rest);
  return match ? { match, players: players ?? [] } : null;
}

const asMatch = (scope: string, data: unknown, error: { message: string } | null): Result<Match> => {
  const res = toResult(scope, data as MatchRow | null, error);
  if (!res.ok) return res;
  const match = toMatch(res.data);
  return match ? ok(match) : fail('THAT MATCH HAS NO PLAYABLE LEVEL');
};

/* Every change to a match is a server function (app/sql/2026-10-12-match-rpc.sql): the client has no write
   access to the tables, and the server alone decides who won, from its own clock. */

/** Challenge a friend or squad mate on `level`. The reply is the new match's id. */
export async function createMatch(opponentId: string, level: Level): Promise<Result<string>> {
  const { data, error } = await supabase.rpc('create_match', { p_opponent: opponentId, p_level: level });
  const res = toResult('createMatch', data as string | null, error);
  if (!res.ok) return res;
  return typeof res.data === 'string' ? ok(res.data) : fail('NO MATCH ID');
}

/** Accept a challenge: the server sets the 3-second countdown and the 5-minute clock. */
export async function acceptMatch(matchId: string): Promise<Result<Match>> {
  const { data, error } = await supabase.rpc('accept_match', { p_match: matchId });
  return asMatch('acceptMatch', data, error);
}

export async function declineMatch(matchId: string): Promise<Result<Match>> {
  const { data, error } = await supabase.rpc('decline_match', { p_match: matchId });
  return asMatch('declineMatch', data, error);
}

/** Send the cats on the board. The server checks they cover every cable, and that the clock has not run out. */
export async function submitMatch(matchId: string, nodes: number[]): Promise<Result<Match>> {
  const { data, error } = await supabase.rpc('submit_match', { p_match: matchId, p_nodes: nodes });
  return asMatch('submitMatch', data, error);
}

/** Give up (or cancel a challenge nobody has accepted). Always the caller's own side. */
export async function forfeitMatch(matchId: string): Promise<Result<Match>> {
  const { data, error } = await supabase.rpc('forfeit_match', { p_match: matchId });
  return asMatch('forfeitMatch', data, error);
}

/** Settle every match whose clock has run out; the reply is how many it settled. */
export async function closeExpiredMatches(): Promise<Result<number>> {
  const { data, error } = await supabase.rpc('close_expired_matches');
  const res = toResult('closeExpiredMatches', data as number | null, error);
  return res.ok ? ok(Number(res.data) || 0) : res;
}

const VIEW_COLUMNS = '*, match_players(*)';

/** One match with both players' rows, or null when it is not yours to see. */
export async function getMatch(matchId: string): Promise<Result<MatchView | null>> {
  const { data, error } = await supabase.from('matches').select(VIEW_COLUMNS).eq('id', matchId).maybeSingle();
  const res = toResult('getMatch', data as ViewRow | null, error);
  if (!res.ok) return res;
  return ok(res.data ? toView(res.data) : null);
}

/** Your challenges, sent and received, newest first. */
export async function listMyMatches(userId: string, limit: number = MY_MATCHES_LIMIT): Promise<Result<MatchView[]>> {
  const { data, error } = await supabase.from('matches').select(VIEW_COLUMNS)
    .or('created_by.eq.' + userId + ',opponent_id.eq.' + userId)
    .order('created_at', { ascending: false }).limit(limit);
  const res = toResult('listMyMatches', (data || []) as ViewRow[], error);
  if (!res.ok) return res;
  return ok(res.data.map(toView).filter((v): v is MatchView => v !== null));
}

/** Wins, losses and draws; null before the first finished match. */
export async function getMatchRecord(userId: string | null): Promise<Result<MatchRecord | null>> {
  if (!userId) return ok(null);
  const { data, error } = await supabase.from('match_records').select('*').eq('user_id', userId).maybeSingle();
  return toResult('getMatchRecord', (data ?? null) as MatchRecord | null, error);
}
