import { beforeEach, describe, expect, it, vi } from 'vitest';

let rpcReply: { data?: unknown; error?: { message: string; code?: string } | null } = {};
let tableReply: { data?: unknown; error?: { message: string; code?: string } | null } = {};
const rpcCalls: { fn: string; args?: unknown }[] = [];
const logged = vi.fn();

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
vi.mock('../logger', () => ({ logger: { error: (...a: unknown[]) => logged(...a) } }));

const { deleteRecipe, listRecipes, saveRecipe } = await import('./recipes');

beforeEach(() => { rpcReply = {}; tableReply = {}; rpcCalls.length = 0; logged.mockReset(); });

describe('recipes repository', () => {
  it('lists recipes in app shape, leaving out (and logging) one whose shape no longer parses', async () => {
    tableReply = { data: [
      { name: 'Open field', shape: { strategy: 'free', density: 1.6 }, note: null },
      { name: 'Broken', shape: { strategy: 'spiral' }, note: '' },
    ] };
    expect(await listRecipes()).toEqual({ ok: true, data: [{ name: 'Open field', shape: { strategy: 'free', density: 1.6 }, note: '' }] });
    expect(logged).toHaveBeenCalledOnce();
  });

  it('reads a missing table as no recipes, and passes other errors on', async () => {
    tableReply = { error: { message: 'missing', code: 'PGRST205' } };
    expect(await listRecipes()).toEqual({ ok: true, data: [] });
    tableReply = { error: { message: 'offline' } };
    expect(await listRecipes()).toEqual({ ok: false, error: 'offline' });
  });

  it('saves and deletes through the admin functions', async () => {
    expect((await saveRecipe('  Open field ', { strategy: 'free' }, 'busy skies')).ok).toBe(true);
    expect((await deleteRecipe('Open field')).ok).toBe(true);
    expect(rpcCalls).toEqual([
      { fn: 'save_generation_recipe', args: { p_name: 'Open field', p_shape: { strategy: 'free' }, p_note: 'busy skies' } },
      { fn: 'delete_generation_recipe', args: { p_name: 'Open field' } },
    ]);
    rpcReply = { error: { message: 'only admins can change level generation' } };
    expect(await saveRecipe('x', {}, '')).toEqual({ ok: false, error: 'only admins can change level generation' });
  });
});
