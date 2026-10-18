import { beforeEach, describe, expect, it, vi } from 'vitest';

type Reply = { data?: unknown; error?: { message: string } | null };
let tables: Record<string, Reply> = {};
let rpcReply: Reply = {};
const rpcCalls: { fn: string; args?: unknown }[] = [];
const eqCalls: { table: string; col: string; val: unknown }[] = [];

function chain(table: string) {
  const proxy: unknown = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'then') return (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null, ...tables[table] });
      return (...args: unknown[]) => { if (prop === 'eq') eqCalls.push({ table, col: String(args[0]), val: args[1] }); return proxy; };
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

const { getWardrobe, setLoadout, NO_WARDROBE } = await import('./cosmetics');

beforeEach(() => { tables = {}; rpcReply = {}; rpcCalls.length = 0; eqCalls.length = 0; });

describe('getWardrobe', () => {
  it('is empty without a user and asks nothing', async () => {
    expect(await getWardrobe(null)).toEqual({ ok: true, data: NO_WARDROBE });
    expect(eqCalls).toHaveLength(0);
  });

  it('reads the owned accessories and the loadout for that user', async () => {
    tables = {
      player_cosmetics: { data: [{ cosmetic_id: 'hard-hat' }, { cosmetic_id: 'scarf' }] },
      player_loadout: { data: [{ slot: 'head', cosmetic_id: 'hard-hat' }, { slot: 'neck', cosmetic_id: 'scarf' }] },
    };
    const res = await getWardrobe('u1');
    expect(res).toEqual({ ok: true, data: { owned: ['hard-hat', 'scarf'], loadout: { head: 'hard-hat', neck: 'scarf' } } });
    expect(eqCalls).toEqual([
      { table: 'player_cosmetics', col: 'user_id', val: 'u1' },
      { table: 'player_loadout', col: 'user_id', val: 'u1' },
    ]);
  });

  it('shows bare for a worn id the player does not own, an unknown id, or a wrong slot', async () => {
    tables = {
      player_cosmetics: { data: [{ cosmetic_id: 'hard-hat' }] },
      player_loadout: { data: [{ slot: 'neck', cosmetic_id: 'hard-hat' }, { slot: 'head', cosmetic_id: 'crown' }] },
    };
    const res = await getWardrobe('u1');
    expect(res.ok && res.data.loadout).toEqual({ head: null, neck: null });
  });

  it('ignores a slot it does not know', async () => {
    tables = { player_cosmetics: { data: [{ cosmetic_id: 'hard-hat' }] }, player_loadout: { data: [{ slot: 'tail', cosmetic_id: 'hard-hat' }] } };
    const res = await getWardrobe('u1');
    expect(res.ok && res.data.loadout).toEqual({ head: null, neck: null });
  });

  it('fails when the tables are missing (migration not applied yet)', async () => {
    tables = { player_cosmetics: { error: { message: 'relation "player_cosmetics" does not exist' } } };
    const res = await getWardrobe('u1');
    expect(res).toEqual({ ok: false, error: 'relation "player_cosmetics" does not exist' });
  });

  it('fails when only the loadout read fails', async () => {
    tables = { player_cosmetics: { data: [] }, player_loadout: { error: { message: 'boom' } } };
    expect(await getWardrobe('u1')).toEqual({ ok: false, error: 'boom' });
  });
});

describe('setLoadout', () => {
  it('calls set_loadout with the slot and the accessory', async () => {
    expect(await setLoadout('head', 'hard-hat')).toEqual({ ok: true, data: null });
    expect(rpcCalls).toEqual([{ fn: 'set_loadout', args: { p_slot: 'head', p_cosmetic: 'hard-hat' } }]);
  });

  it('takes a slot off with null', async () => {
    await setLoadout('neck', null);
    expect(rpcCalls[0].args).toEqual({ p_slot: 'neck', p_cosmetic: null });
  });

  it('reports the server refusing', async () => {
    rpcReply = { error: { message: 'you do not own that accessory' } };
    expect(await setLoadout('head', 'party-hat')).toEqual({ ok: false, error: 'you do not own that accessory' });
  });
});
