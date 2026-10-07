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
const { getCampaignClears, recordCampaignClear, toCampaignClear } = await import('./campaign');
const { getStreak, NO_STREAK } = await import('./streaks');
const { listBadgesOf, listMyBadges } = await import('./badges');
const { scoreRun } = await import('../../domain/scoring');

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

describe('campaign clears', () => {
  const row = { level_no: 7, cats_used: 4, par: 3, stars: 2, campaign_stars: 1 };

  it('rebuilds a played run from the stored numbers', () => {
    expect(toCampaignClear(row)).toEqual({ levelNo: 7, run: scoreRun({ stars: 2, k: 3 }, 4), campaignStars: 1 });
  });
  it('keeps odd stored values inside the legal range', () => {
    expect(toCampaignClear({ ...row, stars: 9, campaign_stars: -2 })).toMatchObject({ run: { stars: 3 }, campaignStars: 0 });
  });
  it('loads a player\'s clears, dropping rows outside levels 1-100', async () => {
    responses.campaign_clears = { data: [row, { ...row, level_no: 101 }, { ...row, level_no: 0 }] };
    const r = await getCampaignClears('me');
    expect(r.ok && r.data.map(c => c.levelNo)).toEqual([7]);
    expect(calls.some(c => c.table === 'campaign_clears' && c.method === 'eq' && c.args[1] === 'me')).toBe(true);
  });
  it('has nothing to load for a signed-out player and never asks the db', async () => {
    expect(await getCampaignClears(null)).toEqual({ ok: true, data: [] });
    expect(calls).toHaveLength(0);
  });
  it('surfaces a failed load (migration not applied yet) as an error Result', async () => {
    responses.campaign_clears = { error: { message: 'relation "campaign_clears" does not exist' } };
    expect(await getCampaignClears('me')).toEqual({ ok: false, error: 'relation "campaign_clears" does not exist' });
  });
  it('upserts a clear on user and level with the run and its campaign stars', async () => {
    responses.campaign_clears = { error: null };
    const run = scoreRun({ stars: 2, k: 3 }, 3);
    expect(await recordCampaignClear('me', 12, run, 3)).toEqual({ ok: true, data: null });
    const up = calls.find(c => c.method === 'upsert')!;
    expect(up.table).toBe('campaign_clears');
    expect(up.args[0]).toEqual({ user_id: 'me', level_no: 12, cats_used: 3, par: 3, stars: 2, campaign_stars: 3 });
    expect(up.args[1]).toEqual({ onConflict: 'user_id,level_no' });
  });
  it('reports a failed save', async () => {
    responses.campaign_clears = { error: { message: 'permission denied' } };
    expect(await recordCampaignClear('me', 1, scoreRun({ stars: 1, k: 2 }, 2), 3)).toEqual({ ok: false, error: 'permission denied' });
  });
});

describe('streaks', () => {
  it('maps the view row to a streak', async () => {
    responses.player_streaks = { data: { current_streak: 4, best_streak: 9 } };
    expect(await getStreak('me')).toEqual({ ok: true, data: { current: 4, best: 9 } });
  });
  it('reads no row as no streak', async () => {
    responses.player_streaks = { data: null };
    expect(await getStreak('me')).toEqual({ ok: true, data: NO_STREAK });
  });
  it('has no streak for a signed-out player and never asks the db', async () => {
    expect(await getStreak(null)).toEqual({ ok: true, data: NO_STREAK });
    expect(calls).toHaveLength(0);
  });
  it('surfaces a failed query (view missing) as an error Result', async () => {
    responses.player_streaks = { error: { message: 'relation "player_streaks" does not exist' } };
    expect(await getStreak('me')).toEqual({ ok: false, error: 'relation "player_streaks" does not exist' });
  });
});

describe('badges', () => {
  it('maps player_badges rows to earned badges', async () => {
    responses.player_badges = { data: [
      { badge_id: 'streak-7', earned_at: '2026-10-01T10:00:00Z' },
      { badge_id: 'first-duel-win', earned_at: '2026-10-02T10:00:00Z' },
    ] };
    expect(await listBadgesOf('me')).toEqual({ ok: true, data: [
      { id: 'streak-7', earnedAt: '2026-10-01T10:00:00Z' },
      { id: 'first-duel-win', earnedAt: '2026-10-02T10:00:00Z' },
    ] });
    expect(calls).toContainEqual({ table: 'player_badges', method: 'eq', args: ['user_id', 'me'] });
  });
  it('reads no rows as no badges', async () => {
    responses.player_badges = { data: null };
    expect(await listBadgesOf('me')).toEqual({ ok: true, data: [] });
  });
  it('surfaces a failed query (table missing) as an error Result', async () => {
    responses.player_badges = { error: { message: 'relation "player_badges" does not exist' } };
    expect(await listBadgesOf('me')).toEqual({ ok: false, error: 'relation "player_badges" does not exist' });
  });
  it('has no badges for a signed-out player and never asks the db', async () => {
    expect(await listMyBadges(null)).toEqual({ ok: true, data: [] });
    expect(calls).toHaveLength(0);
  });
  it('never writes: only select is called on player_badges', async () => {
    responses.player_badges = { data: [] };
    await listBadgesOf('me');
    expect(calls.filter(c => c.table === 'player_badges').map(c => c.method).sort()).toEqual(['eq', 'order', 'select']);
  });
});
