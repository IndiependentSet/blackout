import { beforeEach, describe, expect, it, vi } from 'vitest';

let rpcReply: { data?: unknown; error?: { message: string } | null } = {};
let tableReply: { data?: unknown; error?: { message: string } | null } = {};
const rpcCalls: { fn: string; args?: unknown }[] = [];
const queryCalls: { table: string; method: string; args: unknown[] }[] = [];

/* The query builder as a chain that resolves to the queued reply, as in repositories.test.ts. */
function chain(table: string) {
  const proxy: unknown = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'then') return (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null, ...tableReply });
      return (...args: unknown[]) => { queryCalls.push({ table, method: prop, args }); return proxy; };
    },
  });
  return proxy;
}

vi.mock('../supabase/client', () => ({
  supabase: {
    rpc: (fn: string, args?: unknown) => { rpcCalls.push({ fn, args }); return Promise.resolve({ data: null, error: null, ...rpcReply }); },
    from: (t: string) => chain(t),
  },
  APP_BASE_URL: 'http://localhost',
}));
vi.mock('../logger', () => ({ logger: { error: vi.fn() } }));

const { acceptMatch, closeExpiredMatches, createMatch, forfeitMatch, getMatch, getMatchRecord, listMyMatches, submitMatch } = await import('./matches');

const level = {
  nodes: [{ c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }],
  edges: [[0, 1], [1, 2]] as [number, number][],
  adj: [[1], [0, 2], [1]],
  k: 1, sol: [1], stars: 1 as const,
};
const row = (over: Record<string, unknown> = {}) => ({
  id: 'm1', level, created_by: 'a', opponent_id: 'b', status: 'pending',
  created_at: '2026-10-07T10:00:00Z', starts_at: null, ends_at: null, ended_at: null, winner_id: null, ...over,
});

beforeEach(() => { rpcReply = {}; tableReply = {}; rpcCalls.length = 0; queryCalls.length = 0; });

describe('matches: server functions', () => {
  it('challenges with the graph and returns the new match id', async () => {
    rpcReply = { data: 'm1' };
    expect(await createMatch('b', level)).toEqual({ ok: true, data: 'm1' });
    expect(rpcCalls).toEqual([{ fn: 'create_match', args: { p_opponent: 'b', p_level: level } }]);
  });
  it('reports the server\'s refusal as a Result, not a throw', async () => {
    rpcReply = { error: { message: 'only friends and squad mates can be challenged' } };
    expect(await createMatch('stranger', level)).toEqual({ ok: false, error: 'only friends and squad mates can be challenged' });
  });
  it('fails softly while the migration has not been applied', async () => {
    rpcReply = { error: { message: 'Could not find the function public.create_match in the schema cache' } };
    const r = await createMatch('b', level);
    expect(r.ok).toBe(false);
  });
  it('fails when the reply carries no id', async () => {
    rpcReply = { data: null };
    expect(await createMatch('b', level)).toEqual({ ok: false, error: 'NO MATCH ID' });
  });

  it('accepts a challenge and returns the match as the server clocked it', async () => {
    rpcReply = { data: row({ status: 'active', starts_at: '2026-10-07T10:00:03Z', ends_at: '2026-10-07T10:05:03Z' }) };
    const r = await acceptMatch('m1');
    expect(rpcCalls[0]).toEqual({ fn: 'accept_match', args: { p_match: 'm1' } });
    expect(r.ok && r.data).toMatchObject({ id: 'm1', status: 'active', starts_at: '2026-10-07T10:00:03Z', level });
  });
  it('refuses a reply whose graph is not a level', async () => {
    rpcReply = { data: row({ level: { nodes: [] } }) };
    expect(await acceptMatch('m1')).toEqual({ ok: false, error: 'THAT MATCH HAS NO PLAYABLE LEVEL' });
  });

  it('sends only the cats\' node indices', async () => {
    rpcReply = { data: row({ status: 'done', winner_id: 'a' }) };
    const r = await submitMatch('m1', [1]);
    expect(rpcCalls[0]).toEqual({ fn: 'submit_match', args: { p_match: 'm1', p_nodes: [1] } });
    expect(r.ok && r.data.winner_id).toBe('a');
  });
  it('forfeits through its own function', async () => {
    rpcReply = { data: row({ status: 'done', winner_id: 'b' }) };
    await forfeitMatch('m1');
    expect(rpcCalls[0].fn).toBe('forfeit_match');
  });
  it('returns how many matches the server settled', async () => {
    rpcReply = { data: 2 };
    expect(await closeExpiredMatches()).toEqual({ ok: true, data: 2 });
    rpcReply = { data: null };
    expect(await closeExpiredMatches()).toEqual({ ok: true, data: 0 });
  });
});

describe('matches: reading', () => {
  it('splits a match from its embedded player rows', async () => {
    const players = [{ match_id: 'm1', user_id: 'a', joined_at: null, finished_at: null, cats_used: null, result: null }];
    tableReply = { data: { ...row(), match_players: players } };
    const r = await getMatch('m1');
    expect(r.ok && r.data).toMatchObject({ match: { id: 'm1' }, players });
    expect(queryCalls.find(c => c.method === 'eq')?.args).toEqual(['id', 'm1']);
  });
  it('finds nothing when the match is not yours', async () => {
    tableReply = { data: null };
    expect(await getMatch('nope')).toEqual({ ok: true, data: null });
  });
  it('lists your challenges, newest first, dropping any with a broken graph', async () => {
    tableReply = { data: [{ ...row(), match_players: [] }, { ...row({ id: 'm2', level: 'oops' }), match_players: [] }] };
    const r = await listMyMatches('a');
    expect(r.ok && r.data.map(v => v.match.id)).toEqual(['m1']);
    expect(queryCalls.find(c => c.method === 'or')?.args).toEqual(['created_by.eq.a,opponent_id.eq.a']);
    expect(queryCalls.find(c => c.method === 'order')?.args).toEqual(['created_at', { ascending: false }]);
  });
  it('reads the head-to-head record, and none for a signed-out player without asking', async () => {
    expect(await getMatchRecord(null)).toEqual({ ok: true, data: null });
    expect(queryCalls).toHaveLength(0);
    tableReply = { data: { user_id: 'a', name: 'a', played: 3, won: 2, lost: 1, drawn: 0 } };
    const r = await getMatchRecord('a');
    expect(r.ok && r.data).toMatchObject({ won: 2, lost: 1 });
  });
});
