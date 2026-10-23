import { beforeEach, describe, expect, it, vi } from 'vitest';

let rpcReply: { data?: unknown; error?: { message: string; code?: string } | null } = {};
const rpcCalls: { fn: string; args?: unknown }[] = [];
const logged = vi.fn();

vi.mock('../supabase/client', () => ({
  supabase: { rpc: (fn: string, args?: unknown) => { rpcCalls.push({ fn, args }); return Promise.resolve({ data: null, error: null, ...rpcReply }); } },
  APP_BASE_URL: 'http://localhost',
}));
vi.mock('../logger', () => ({ logger: { error: (...a: unknown[]) => logged(...a) } }));

const { listPinnedSkies, pinSky, unpinSky } = await import('./dailyManualLevels');

const path3 = { nodes: [{ c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }], edges: [[0, 1], [1, 2]] as [number, number][] };
const pair = { nodes: [{ c: 0, r: 0 }, { c: 1, r: 0 }], edges: [[0, 1]] as [number, number][] };

beforeEach(() => { rpcReply = {}; rpcCalls.length = 0; logged.mockReset(); });

describe('pinned skies repository', () => {
  it('lists drawings, leaving out (and logging) one that does not parse', async () => {
    rpcReply = { data: [{ day: 9, idx: 2, figure: path3, note: null }, { day: 9, idx: 3, figure: { nodes: 'x' }, note: '' }] };
    expect(await listPinnedSkies()).toEqual({ ok: true, data: [{ day: 9, idx: 2, figure: path3, note: '' }] });
    expect(logged).toHaveBeenCalledOnce();
  });
  it('reads a missing function as nothing pinned', async () => {
    rpcReply = { error: { message: 'missing', code: 'PGRST202' } };
    expect(await listPinnedSkies()).toEqual({ ok: true, data: [] });
  });
  it('pins a playable drawing with the level it makes, and refuses one with two answers', async () => {
    expect((await pinSky(9, 2, path3)).ok).toBe(true);
    expect(rpcCalls[0]).toMatchObject({ fn: 'save_daily_manual_level', args: { p_day: 9, p_idx: 2, p_level: { k: 1, sol: [1] }, p_figure: path3 } });
    const r = await pinSky(9, 2, pair);
    expect(r.ok).toBe(false);
    expect(rpcCalls).toHaveLength(1);
  });
  it('unpins through the admin function', async () => {
    expect((await unpinSky(9, 2)).ok).toBe(true);
    expect(rpcCalls[0]).toEqual({ fn: 'delete_daily_manual_level', args: { p_day: 9, p_idx: 2 } });
  });
});
