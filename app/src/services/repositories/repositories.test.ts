import { beforeEach, describe, expect, it, vi } from 'vitest';

/* A tiny chainable stand-in for the Supabase query builder: every builder
   method returns the chain, and awaiting it yields the queued response. */
let responses: Record<string, { data?: unknown; error?: unknown; count?: number }> = {};
const calls: { table: string; method: string; args: unknown[] }[] = [];

function chain(table: string) {
  const c: Record<string, unknown> = {};
  const proxy: unknown = new Proxy(c, {
    get(_t, prop: string) {
      if (prop === 'then') {
        const r = responses[table] ?? { data: null, error: null };
        return (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null, ...r });
      }
      return (...args: unknown[]) => { calls.push({ table, method: prop, args }); return proxy; };
    },
  });
  return proxy;
}

vi.mock('../supabase/client', () => ({
  supabase: { from: (t: string) => chain(t) },
  APP_BASE_URL: 'http://localhost',
}));
vi.mock('../logger', () => ({ logger: { error: vi.fn() } }));

const { setUsername, searchPlayers } = await import('./profiles');
const { getFriendships } = await import('./friendships');
const { getBoardFor } = await import('./leaderboards');
const { createSquad, joinSquadByCode } = await import('./squads');

beforeEach(() => { responses = {}; calls.length = 0; });

describe('profiles', () => {
  it('rejects handles that are too short without touching the db', async () => {
    const r = await setUsername('u1', '!!a');
    expect(r).toEqual({ ok: false, error: 'AT LEAST 3 CHARACTERS (A-Z, 0-9, _).' });
    expect(calls).toHaveLength(0);
  });
  it('rejects a taken handle', async () => {
    responses.profiles = { data: [{ id: 'someone-else' }] };
    expect(await setUsername('u1', 'Taken_1')).toEqual({ ok: false, error: 'THAT HANDLE IS TAKEN.' });
  });
  it('maps the unique-violation race to the same copy', async () => {
    responses.profiles = { data: [], error: { message: 'dup', code: '23505' } };
    expect(await setUsername('u1', 'racer')).toEqual({ ok: false, error: 'THAT HANDLE IS TAKEN.' });
  });
  it('cleans and saves a handle', async () => {
    responses.profiles = { data: [] };
    expect(await setUsername('u1', 'Cool Cat!')).toEqual({ ok: true, data: 'coolcat' });
  });
  it('ignores one-letter searches and removes yourself from results', async () => {
    expect(await searchPlayers('a', 'me')).toEqual({ ok: true, data: [] });
    responses.profiles = { data: [{ id: 'me' }, { id: 'you' }] };
    expect(await searchPlayers('yo', 'me')).toEqual({ ok: true, data: [{ id: 'you' }] });
  });
});

describe('friendships', () => {
  it('splits rows into friends / incoming / outgoing', async () => {
    responses.friendships = { data: [
      { id: '1', requester_id: 'me', addressee_id: 'a', status: 'accepted' },
      { id: '2', requester_id: 'b', addressee_id: 'me', status: 'pending' },
      { id: '3', requester_id: 'me', addressee_id: 'c', status: 'pending' },
    ] };
    responses.profiles = { data: [{ id: 'a', username: 'ann' }, { id: 'b', username: 'bob' }] };
    const r = await getFriendships('me');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.friends.map(f => f.person.id)).toEqual(['a']);
    expect(r.data.incoming.map(f => f.person.username)).toEqual(['bob']);
    expect(r.data.outgoing.map(f => f.person.id)).toEqual(['c']);   // unknown profile falls back to { id }
  });
  it('surfaces a failed query as an error Result', async () => {
    responses.friendships = { error: { message: 'boom' } };
    expect(await getFriendships('me')).toEqual({ ok: false, error: 'boom' });
  });
});

describe('leaderboards', () => {
  it('sorts a board by the chosen scope, best first', async () => {
    responses.player_scores = { data: [
      { user_id: 'a', name: 'a', score: 5, week_score: 9 },
      { user_id: 'b', name: 'b', score: 8, week_score: 1 },
    ] };
    const week = await getBoardFor(['a', 'b'], 'week');
    const all = await getBoardFor(['a', 'b'], 'allTime');
    expect(week.ok && week.data.map(r => r.user_id)).toEqual(['a', 'b']);
    expect(all.ok && all.data.map(r => r.user_id)).toEqual(['b', 'a']);
  });
});

describe('squads', () => {
  it('validates names and codes locally', async () => {
    expect(await createSquad('u', ' x ')).toEqual({ ok: false, error: 'GIVE THE SQUAD A NAME.' });
    expect(await joinSquadByCode('u', '  ')).toEqual({ ok: false, error: 'ENTER AN INVITE CODE.' });
  });
  it('reports an unknown invite code', async () => {
    responses.squads = { data: null };
    expect(await joinSquadByCode('u', 'site-0000')).toEqual({ ok: false, error: 'NO SQUAD WITH THAT CODE.' });
  });
});
