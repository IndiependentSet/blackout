import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LevelCurve } from '../../domain/generation';

let rpcReply: { data?: unknown; error?: { message: string } | null } = {};
let tableReply: { data?: unknown; error?: { message: string } | null } = {};
const rpcCalls: { fn: string; args?: unknown }[] = [];

function chain() {
  const proxy: unknown = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'then') return (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null, ...tableReply });
      return () => proxy;
    },
  });
  return proxy;
}

vi.mock('../supabase/client', () => ({
  supabase: {
    rpc: (fn: string, args?: unknown) => { rpcCalls.push({ fn, args }); return Promise.resolve({ data: null, error: null, ...rpcReply }); },
    from: () => chain(),
  },
  APP_BASE_URL: 'http://localhost',
}));
vi.mock('../logger', () => ({ logger: { error: vi.fn() } }));

/* the global test setup stubs listPools; this file is about the real one */
const { getCampaignLevel, getSurvivalLevel, isUnpublished, listPools, publishPool } =
  await vi.importActual<typeof import('./levelPools')>('./levelPools');
const { poolLevelSource } = await import('../levels/poolLevelSource');

const level = {
  nodes: [{ c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }],
  edges: [[0, 1], [1, 2]] as [number, number][],
  adj: [[1], [0, 2], [1]],
  k: 1, sol: [1], stars: 1 as const,
};
const curve: LevelCurve = { version: 1, seed: 1, retries: 1, fallback: { diff: 1, options: {} }, tiers: [{ count: 1, size: 4, diff: 1, options: {} }] };

beforeEach(() => { rpcReply = {}; tableReply = {}; rpcCalls.length = 0; });

describe('level pool reads', () => {
  it('asks the server for a campaign level by number', async () => {
    rpcReply = { data: level };
    expect(await getCampaignLevel(7)).toEqual({ ok: true, data: level });
    expect(rpcCalls).toEqual([{ fn: 'campaign_level', args: { p_level_no: 7 } }]);
  });

  it('asks for a survival level by run seed and step', async () => {
    rpcReply = { data: level };
    expect(await getSurvivalLevel('seed-1', 3)).toEqual({ ok: true, data: level });
    expect(rpcCalls).toEqual([{ fn: 'survival_level', args: { p_seed: 'seed-1', p_step: 3 } }]);
  });

  it('refuses something that is not a level', async () => {
    rpcReply = { data: { nodes: [] } };
    const r = await getCampaignLevel(1);
    expect(r.ok).toBe(false);
  });

  it('passes the server\'s refusal on, and knows an empty pool when it sees one', async () => {
    rpcReply = { error: { message: 'no campaign levels published' } };
    const r = await getCampaignLevel(1);
    expect(r).toEqual({ ok: false, error: 'no campaign levels published' });
    expect(isUnpublished('no campaign levels published')).toBe(true);
    expect(isUnpublished('fetch failed')).toBe(false);
  });
});

describe('poolLevelSource', () => {
  it('routes campaign and survival to the server, and has no 1vs1 level to give', async () => {
    rpcReply = { data: level };
    expect((await poolLevelSource.getLevel({ mode: 'campaign', levelNo: 2 })).ok).toBe(true);
    expect((await poolLevelSource.getLevel({ mode: 'survival', runSeed: 's', step: 0 })).ok).toBe(true);
    expect((await poolLevelSource.getLevel({ mode: 'match', matchId: 'm' })).ok).toBe(false);
    expect(rpcCalls.map(c => c.fn)).toEqual(['campaign_level', 'survival_level']);
  });
});

describe('pool admin calls', () => {
  it('lists the published pools, newest first, in app shape', async () => {
    tableReply = { data: [{ id: 2, mode: 'match', version: 2, note: null, level_count: 20, created_at: '2026-10-20T10:00:00Z', curve: {} }] };
    expect(await listPools('match')).toEqual({ ok: true, data: [{ id: 2, mode: 'match', version: 2, note: '', levelCount: 20, createdAt: '2026-10-20T10:00:00Z', curve: {} }] });
  });

  it('publishes the entries with the curve that made them and answers the version', async () => {
    rpcReply = { data: 3 };
    const entries = [{ slot: 0, tier: 0, level }];
    expect(await publishPool('survival', curve, entries, 'first')).toEqual({ ok: true, data: 3 });
    expect(rpcCalls).toEqual([{ fn: 'publish_level_pool', args: { p_mode: 'survival', p_curve: curve, p_levels: entries, p_note: 'first' } }]);
  });

  it('reports a refusal', async () => {
    rpcReply = { error: { message: 'only admins can publish level pools' } };
    expect(await publishPool('survival', curve, [], '')).toEqual({ ok: false, error: 'only admins can publish level pools' });
  });
});
