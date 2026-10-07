import { describe, expect, it } from 'vitest';
import { countdownMs, groupMatches, isMatchLevel, matchOutcome, matchRemainingMs, matchStatus, otherPlayer, RECENT_MATCHES } from './match';
import type { MatchView } from './types';

/* a path 0-1-2: the only optimal cover is the middle node */
const path = () => ({
  nodes: [{ c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }],
  edges: [[0, 1], [1, 2]],
  adj: [[1], [0, 2], [1]],
  k: 1, sol: [1], stars: 1,
});

const START = '2026-10-07T10:00:03.000Z';
const END = '2026-10-07T10:05:03.000Z';
const t = (iso: string) => Date.parse(iso);

describe('matchStatus', () => {
  const active = { status: 'active' as const, starts_at: START, ends_at: END };

  it('passes the stored states through', () => {
    for (const status of ['pending', 'done', 'void'] as const) expect(matchStatus({ ...active, status }, t(START))).toBe(status);
  });
  it('is a countdown until starts_at, then live', () => {
    expect(matchStatus(active, t(START) - 1)).toBe('countdown');
    expect(matchStatus(active, t(START))).toBe('live');
    expect(matchStatus(active, t(END) + 5_000)).toBe('live');
  });
  it('reads an active match with no start time as a countdown', () => {
    expect(matchStatus({ status: 'active', starts_at: null, ends_at: null }, 0)).toBe('countdown');
  });
});

describe('clocks', () => {
  it('counts down to the start and stops at zero', () => {
    expect(countdownMs(START, t(START) - 2_500)).toBe(2_500);
    expect(countdownMs(START, t(START))).toBe(0);
    expect(countdownMs(START, t(START) + 9_000)).toBe(0);
    expect(countdownMs(null, 0)).toBe(0);
  });
  it('counts the match clock down to zero', () => {
    expect(matchRemainingMs(END, t(END) - 61_000)).toBe(61_000);
    expect(matchRemainingMs(END, t(END) + 1)).toBe(0);
    expect(matchRemainingMs(null, 0)).toBe(0);
  });
});

describe('matchOutcome', () => {
  it('is open until the server decides', () => {
    expect(matchOutcome({ status: 'pending', winner_id: null }, 'me')).toBe('open');
    expect(matchOutcome({ status: 'active', winner_id: null }, 'me')).toBe('open');
  });
  it('tells a win, a loss, a draw and a void apart', () => {
    expect(matchOutcome({ status: 'done', winner_id: 'me' }, 'me')).toBe('won');
    expect(matchOutcome({ status: 'done', winner_id: 'you' }, 'me')).toBe('lost');
    expect(matchOutcome({ status: 'done', winner_id: null }, 'me')).toBe('drawn');
    expect(matchOutcome({ status: 'void', winner_id: null }, 'me')).toBe('void');
  });
});

describe('otherPlayer', () => {
  it('is whoever is not me', () => {
    const m = { created_by: 'a', opponent_id: 'b' };
    expect(otherPlayer(m, 'a')).toBe('b');
    expect(otherPlayer(m, 'b')).toBe('a');
  });
});

describe('isMatchLevel', () => {
  it('accepts a real level, and what survives a JSON round trip', () => {
    expect(isMatchLevel(path())).toBe(true);
    expect(isMatchLevel(JSON.parse(JSON.stringify(path())))).toBe(true);
  });

  const bad: [string, (lv: ReturnType<typeof path>) => unknown][] = [
    ['not an object', () => 'level'],
    ['null', () => null],
    ['an edge to a node that is not there', lv => ({ ...lv, edges: [[0, 1], [1, 9]] })],
    ['an edge from a node to itself', lv => ({ ...lv, edges: [[0, 1], [1, 1]], adj: [[1], [0, 1, 1], []] })],
    ['adj that disagrees with the edges', lv => ({ ...lv, adj: [[1], [0], [1]] })],
    ['adj of the wrong length', lv => ({ ...lv, adj: [[1], [0, 2]] })],
    ['a solution that is not a cover', lv => ({ ...lv, sol: [0] })],
    ['a solution whose size is not k', lv => ({ ...lv, k: 2 })],
    ['a solution naming a node twice', lv => ({ ...lv, k: 2, sol: [1, 1] })],
    ['no edges', lv => ({ ...lv, edges: [], adj: [[], [], []], sol: [] })],
    ['fractional stars', lv => ({ ...lv, stars: 1.5 })],
    ['stars out of range', lv => ({ ...lv, stars: 4 })],
    ['a cell with no row', lv => ({ ...lv, nodes: [{ c: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }] })],
    ['a missing field', lv => ({ nodes: lv.nodes, edges: lv.edges, adj: lv.adj, k: lv.k, stars: lv.stars })],
  ];
  it.each(bad)('rejects %s', (_name, make) => {
    expect(isMatchLevel(make(path()))).toBe(false);
  });

  it('rejects a graph bigger than the server will store', () => {
    const n = 201;
    const nodes = Array.from({ length: n }, (_, i) => ({ c: i, r: 0 }));
    const edges = Array.from({ length: n - 1 }, (_, i) => [i, i + 1]);
    const adj = nodes.map((_, i) => [i > 0 ? i - 1 : -1, i < n - 1 ? i + 1 : -1].filter(j => j >= 0));
    const sol = Array.from({ length: Math.floor(n / 2) }, (_, i) => 2 * i + 1);
    expect(isMatchLevel({ nodes, edges, adj, k: sol.length, sol, stars: 3 })).toBe(false);
  });
});

describe('groupMatches', () => {
  const view = (id: string, status: 'pending' | 'active' | 'done' | 'void', created_by: string, opponent_id: string): MatchView => ({
    match: { id, level: path() as never, created_by, opponent_id, status, created_at: '', starts_at: null, ends_at: null, ended_at: null, winner_id: null },
    players: [],
  });

  it('sorts challenges by who is waiting on whom, and keeps what is on the clock apart', () => {
    const g = groupMatches([
      view('in', 'pending', 'you', 'me'), view('out', 'pending', 'me', 'you'),
      view('live', 'active', 'me', 'you'), view('won', 'done', 'you', 'me'), view('off', 'void', 'me', 'you'),
    ], 'me');
    expect(g.incoming.map(v => v.match.id)).toEqual(['in']);
    expect(g.sent.map(v => v.match.id)).toEqual(['out']);
    expect(g.playing.map(v => v.match.id)).toEqual(['live']);
    expect(g.recent.map(v => v.match.id)).toEqual(['won', 'off']);
  });
  it('keeps only the latest few finished matches', () => {
    const many = Array.from({ length: RECENT_MATCHES + 3 }, (_, i) => view('d' + i, 'done', 'me', 'you'));
    expect(groupMatches(many, 'me').recent).toHaveLength(RECENT_MATCHES);
  });
  it('is empty for no matches', () => {
    expect(groupMatches([], 'me')).toEqual({ incoming: [], sent: [], playing: [], recent: [] });
  });
});
