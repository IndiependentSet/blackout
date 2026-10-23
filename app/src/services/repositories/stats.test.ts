import { beforeEach, describe, expect, it, vi } from 'vitest';

let response: { data?: unknown; error?: unknown } = {};
const calls: string[] = [];
vi.mock('../supabase/client', () => ({
  supabase: { rpc: (fn: string) => { calls.push(fn); return Promise.resolve({ data: null, error: null, ...response }); } },
  APP_BASE_URL: 'http://localhost',
}));
vi.mock('../logger', () => ({ logger: { error: vi.fn() } }));

const { getPlayerStats } = await import('./stats');

beforeEach(() => { response = {}; calls.length = 0; });

describe('getPlayerStats', () => {
  it('reads player_stats and shapes it', async () => {
    response = { data: { nights: { played: 2, skies: 8, at_par: 7 }, streak: { best: 3 } } };
    const res = await getPlayerStats();
    expect(calls).toEqual(['player_stats']);
    expect(res.ok && res.data.nights).toMatchObject({ played: 2, skies: 8, atPar: 7 });
    expect(res.ok && res.data.streak.best).toBe(3);
  });
  it('reads an empty answer as a player with nothing', async () => {
    const res = await getPlayerStats();
    expect(res.ok && res.data.nights.skies).toBe(0);
  });
  it('fails with the server message', async () => {
    response = { error: { message: 'sign in to read your stats' } };
    expect(await getPlayerStats()).toEqual({ ok: false, error: 'sign in to read your stats' });
  });
});
