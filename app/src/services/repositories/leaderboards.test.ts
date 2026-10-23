import { beforeEach, describe, expect, it, vi } from 'vitest';

let response: { data?: unknown; error?: unknown } = {};
const calls: { fn: string; args: unknown }[] = [];

vi.mock('../supabase/client', () => ({
  supabase: { rpc: (fn: string, args?: unknown) => { calls.push({ fn, args }); return Promise.resolve({ data: null, error: null, ...response }); } },
  APP_BASE_URL: 'http://localhost',
}));
vi.mock('../logger', () => ({ logger: { error: vi.fn() } }));

const { getBoard } = await import('./leaderboards');

beforeEach(() => { response = {}; calls.length = 0; });

const raw = (over = {}) => ({ place: 1, total: 2, user_id: 'a', username: 'ann', avatar: null, value: 50, extra: 2, is_me: true, trend: null, won_vs: null, lost_vs: null, ...over });

describe('getBoard', () => {
  it('asks board_rows for the board and shapes its rows', async () => {
    response = { data: [raw(), raw({ place: 2, user_id: 'b', username: 'bob', is_me: false })] };
    const res = await getBoard('night', { day: 412, ids: ['a', 'b'], limit: 5 });
    expect(calls[0]).toEqual({ fn: 'board_rows', args: { p_board: 'night', p_limit: 5, p_day: 412, p_ids: ['a', 'b'] } });
    expect(res.ok && res.data.total).toBe(2);
    expect(res.ok && res.data.entries.map(e => e.username)).toEqual(['ann', 'bob']);
  });
  it('asks for the window around the player when told to', async () => {
    await getBoard('duel', { limit: 3, around: 3 });
    expect(calls[0].args).toEqual({ p_board: 'duel', p_limit: 3, p_around: 3 });
  });
  it('leaves the night and the circle out unless asked, and lists 20 rows', async () => {
    await getBoard('rush');
    expect(calls[0].args).toEqual({ p_board: 'rush', p_limit: 20 });
  });
  it('answers an empty board with nothing on it', async () => {
    response = { data: [] };
    expect(await getBoard('voyage')).toEqual({ ok: true, data: { entries: [], total: 0 } });
  });
  it('fails with the server message', async () => {
    response = { error: { message: 'sign in to read the ladder' } };
    expect(await getBoard('duel')).toEqual({ ok: false, error: 'sign in to read the ladder' });
  });
});
