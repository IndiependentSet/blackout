import { isCleared } from './cover';
import type { Level, Match, MatchResult, MatchStatus, MatchView, PlaySet } from './types';

/** A match is one graph, with no site count or pips: the plaque says "SITE 1" and the HUD does the rest. */
export const MATCH_SET: PlaySet = {
  count: 1, open: true, unitLabel: 'SITE', finishLabel: 'MATCH OVER',
  name: () => '1VS1 MATCH',
};

/** From the server accepting a challenge to the first tap. */
export const MATCH_COUNTDOWN_MS = 3_000;
/** From the first tap to the clock running out. */
export const MATCH_LIMIT_MS = 5 * 60_000;
/** How long an opponent's presence may be missing before the screen says they are gone. */
export const MATCH_GRACE_MS = 30_000;

/** Mirrors `level_is_valid` in app/sql/2026-10-11-cover-is-valid.sql: the biggest graph a match will hold. */
export const MATCH_MAX_NODES = 200;
export const MATCH_MAX_EDGES = 600;

type Timing = Pick<Match, 'status' | 'starts_at' | 'ends_at'>;

const ms = (iso: string | null): number => (iso === null ? NaN : Date.parse(iso));

/* The server stores four states; the 3-second countdown and the live clock are told apart here, from its
   `starts_at`, so nothing has to flip a flag at the right second. A match whose clock has run out but which
   the server has not yet settled still reads `live`: the screen shows 0:00 and asks the server to settle it. */
export function matchStatus(m: Timing, now: number): MatchStatus {
  if (m.status !== 'active') return m.status;
  const start = ms(m.starts_at);
  return Number.isNaN(start) || now < start ? 'countdown' : 'live';
}

/** Milliseconds until the first tap is allowed; 0 once it has started (or if the server has set no start). */
export function countdownMs(startsAt: string | null, now: number): number {
  const start = ms(startsAt);
  return Number.isNaN(start) ? 0 : Math.max(0, start - now);
}

/** Milliseconds left on the match clock; 0 once it has run out. */
export function matchRemainingMs(endsAt: string | null, now: number): number {
  const end = ms(endsAt);
  return Number.isNaN(end) ? 0 : Math.max(0, end - now);
}

/** How a match stands for `me`: `open` until the server has decided it. */
export function matchOutcome(m: Pick<Match, 'status' | 'winner_id'>, me: string): MatchResult | 'open' {
  if (m.status === 'void') return 'void';
  if (m.status !== 'done') return 'open';
  if (m.winner_id === null) return 'drawn';
  return m.winner_id === me ? 'won' : 'lost';
}

/** The other player of a match. */
export const otherPlayer = (m: Pick<Match, 'created_by' | 'opponent_id'>, me: string): string =>
  m.created_by === me ? m.opponent_id : m.created_by;

const isInt = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x);
const isIndex = (x: unknown, n: number): x is number => isInt(x) && x >= 0 && x < n;

/* What comes back from the `level` jsonb column is just JSON: before the board is built from it, check it is a
   level. This is the client's half of the check; level_is_valid() in SQL is the server's. */
export function isMatchLevel(json: unknown): json is Level {
  if (typeof json !== 'object' || json === null) return false;
  const { nodes, edges, adj, sol, k, stars } = json as Record<string, unknown>;

  if (!Array.isArray(nodes) || nodes.length < 2 || nodes.length > MATCH_MAX_NODES) return false;
  const n = nodes.length;
  const cellOk = (c: unknown) => typeof c === 'object' && c !== null && isInt((c as { c?: unknown }).c) && isInt((c as { r?: unknown }).r);
  if (!nodes.every(cellOk)) return false;

  if (!Array.isArray(edges) || edges.length < 1 || edges.length > MATCH_MAX_EDGES) return false;
  const edgeOk = (e: unknown) => Array.isArray(e) && e.length === 2 && isIndex(e[0], n) && isIndex(e[1], n) && e[0] !== e[1];
  if (!edges.every(edgeOk)) return false;
  const pairs = edges as [number, number][];

  if (!Array.isArray(adj) || adj.length !== n) return false;
  if (!adj.every(row => Array.isArray(row) && row.every(j => isIndex(j, n)))) return false;
  const rows = adj as number[][];
  if (rows.reduce((sum, row) => sum + row.length, 0) !== 2 * pairs.length) return false;
  if (!pairs.every(([u, v]) => rows[u].includes(v) && rows[v].includes(u))) return false;

  if (!isInt(k) || k < 1 || (stars !== 1 && stars !== 2 && stars !== 3)) return false;
  if (!Array.isArray(sol) || sol.length !== k || !sol.every(x => isIndex(x, n)) || new Set(sol).size !== k) return false;
  return isCleared({ edges: pairs }, sol as number[]);
}

export interface MatchGroups {
  /** challenges sent to me, waiting for my answer */
  incoming: MatchView[];
  /** challenges I sent, not yet accepted */
  sent: MatchView[];
  /** accepted and still on the clock */
  playing: MatchView[];
  /** the last few that are over, newest first */
  recent: MatchView[];
}

export const RECENT_MATCHES = 5;

/** Sort my matches (newest first, as the server returns them) into the lobby's four lists. */
export function groupMatches(views: readonly MatchView[], me: string): MatchGroups {
  const groups: MatchGroups = { incoming: [], sent: [], playing: [], recent: [] };
  for (const v of views) {
    const { status, opponent_id } = v.match;
    if (status === 'pending') (opponent_id === me ? groups.incoming : groups.sent).push(v);
    else if (status === 'active') groups.playing.push(v);
    else if (groups.recent.length < RECENT_MATCHES) groups.recent.push(v);
  }
  return groups;
}
