import { beforeEach, describe, expect, it, vi } from 'vitest';

/* The Supabase query builder reduced to what the survival repository uses: `from(view)` chains and `rpc(fn, args)`. */
let responses: Record<string, { data?: unknown; error?: unknown }> = {};
const calls: { target: string; method: string; args: unknown[] }[] = [];

function chain(target: string) {
  const proxy: unknown = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'then') {
        const r = responses[target] ?? {};
        return (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null, ...r });
      }
      return (...args: unknown[]) => { calls.push({ target, method: prop, args }); return proxy; };
    },
  });
  return proxy;
}

vi.mock('../supabase/client', () => ({
  supabase: {
    from: (view: string) => chain(view),
    rpc: (fn: string, args?: unknown) => { calls.push({ target: fn, method: 'rpc', args: [args] }); return chain(fn); },
  },
  APP_BASE_URL: 'http://localhost',
}));
vi.mock('../logger', () => ({ logger: { error: vi.fn() } }));

const { startSurvivalRun, submitSurvivalSite, getSurvivalLeaderboard, getBestRun } = await import('./survival');


beforeEach(() => { responses = {}; calls.length = 0; });

describe('startSurvivalRun', () => {
  it('returns the id the server gave the run', async () => {
    responses.start_survival_run = { data: 'run-1' };
    expect(await startSurvivalRun('seed-1')).toEqual({ ok: true, data: 'run-1' });
    expect(calls[0]).toMatchObject({ target: 'start_survival_run', method: 'rpc' });
  });

  it('fails when the server answers with no id', async () => {
    responses.start_survival_run = { data: null };
    expect(await startSurvivalRun('seed-1')).toEqual({ ok: false, error: 'NO SURVIVAL RUN ID' });
  });

  it('reports a missing function or a refusal as a failed Result', async () => {
    responses.start_survival_run = { error: { message: 'function public.start_survival_run() does not exist' } };
    expect(await startSurvivalRun('seed-1')).toEqual({ ok: false, error: 'function public.start_survival_run() does not exist' });
  });
});

describe('submitSurvivalSite', () => {
  it('sends the run, the site and the cats, and maps the reply', async () => {
    responses.submit_survival_site = { data: { sites: 2, perfect: 1, score: 35 } };
    const r = await submitSurvivalSite('run-1', 1, [4, 7, 9]);
    expect(r).toEqual({ ok: true, data: { sites: 2, perfect: 1, score: 35 } });
    expect(calls[0].args[0]).toEqual({ p_run_id: 'run-1', p_step: 1, p_nodes: [4, 7, 9] });
  });

  it('coerces missing numbers to zero', async () => {
    responses.submit_survival_site = { data: { sites: '3' } };
    expect(await submitSurvivalSite('run-1', 0, [1])).toEqual({ ok: true, data: { sites: 3, perfect: 0, score: 0 } });
  });

  it('fails on a server refusal, such as a run whose time is up', async () => {
    responses.submit_survival_site = { error: { message: 'survival run is over' } };
    expect(await submitSurvivalSite('run-1', 0, [1])).toEqual({ ok: false, error: 'survival run is over' });
  });

  it('fails when the server replies with nothing', async () => {
    expect(await submitSurvivalSite('run-1', 0, [1])).toEqual({ ok: false, error: 'NO SURVIVAL REPLY' });
  });
});

describe('getSurvivalLeaderboard', () => {
  it('reads the view best first and keeps the numbers numeric', async () => {
    responses.leaderboard_survival = { data: [{ user_id: 'a', username: 'tom', sites: '5', perfect: 4, score: 120 }] };
    expect(await getSurvivalLeaderboard(3)).toEqual({
      ok: true, data: [{ user_id: 'a', username: 'tom', sites: 5, perfect: 4, score: 120 }],
    });
    const order = calls.filter(c => c.method === 'order').map(c => c.args[0]);
    expect(order).toEqual(['sites', 'score']);
    expect(calls.find(c => c.method === 'limit')?.args[0]).toBe(3);
  });

  it('is an empty board before anyone has played, and a failure when the view is missing', async () => {
    expect(await getSurvivalLeaderboard()).toEqual({ ok: true, data: [] });
    responses.leaderboard_survival = { error: { message: 'relation "leaderboard_survival" does not exist' } };
    expect(await getSurvivalLeaderboard()).toMatchObject({ ok: false });
  });
});

describe('getBestRun', () => {
  it('is nothing for a signed-out player without asking the server', async () => {
    expect(await getBestRun(null)).toEqual({ ok: true, data: null });
    expect(calls).toHaveLength(0);
  });

  it('maps the player\'s row, and reads no row as no record', async () => {
    responses.leaderboard_survival = { data: { sites: 6, perfect: 5, score: 210 } };
    expect(await getBestRun('me')).toEqual({ ok: true, data: { sites: 6, perfect: 5, score: 210 } });
    expect(calls.some(c => c.method === 'eq' && c.args[1] === 'me')).toBe(true);
    responses.leaderboard_survival = { data: null };
    expect(await getBestRun('me')).toEqual({ ok: true, data: null });
  });
});
