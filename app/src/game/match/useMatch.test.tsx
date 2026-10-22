import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MATCH_GRACE_MS } from '../../domain/match';
import { ok } from '../../services/result';
import { END, START, fakeDeps, matchRow, playerRow, viewOf } from './matchFixtures';
import { useMatch } from './useMatch';

vi.mock('../../services/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('../../services/supabase/client', () => ({ supabase: {}, APP_BASE_URL: 'http://localhost' }));

const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });
const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(START - 2_000); });
afterEach(() => vi.useRealTimers());

describe('useMatch: loading and the channel', () => {
  it('reads the match, names the opponent and opens the match channel', async () => {
    const { deps, channels } = fakeDeps(viewOf(matchRow()));
    const { result } = renderHook(() => useMatch('m1', 'me', deps));
    expect(result.current.loading).toBe(true);
    await flush();
    expect(result.current.loading).toBe(false);
    expect(result.current.view?.match.id).toBe('m1');
    expect(result.current.opponentName).toBe('@rival');
    expect(deps.openChannel).toHaveBeenCalledWith('m1', 'me', expect.any(Object));
    expect(channels).toHaveLength(1);
  });

  it('closes the channel when the screen goes', async () => {
    const { deps, channels } = fakeDeps(viewOf(matchRow()));
    const { unmount } = renderHook(() => useMatch('m1', 'me', deps));
    await flush();
    unmount();
    expect(channels[0].close).toHaveBeenCalledOnce();
  });

  it('reports a match that is not yours to see as no view, not an error', async () => {
    const { deps } = fakeDeps(null);
    const { result } = renderHook(() => useMatch('nope', 'me', deps));
    await flush();
    expect(result.current).toMatchObject({ loading: false, view: null, error: null, status: null });
  });

  it('shows a failed read as an error', async () => {
    const { deps } = fakeDeps(null);
    deps.getMatch = vi.fn(async () => ({ ok: false as const, error: 'no connection' }));
    const { result } = renderHook(() => useMatch('m1', 'me', deps));
    await flush();
    expect(result.current.error).toBe('no connection');
  });

  it('reads the match again when the server says it changed, and keeps the same level object', async () => {
    const { deps, state, channels } = fakeDeps(viewOf(matchRow({ status: 'pending', starts_at: null, ends_at: null })));
    const { result } = renderHook(() => useMatch('m1', 'me', deps));
    await flush();
    const before = result.current.view!.match.level;
    expect(result.current.status).toBe('pending');

    state.view = viewOf(matchRow({ level: JSON.parse(JSON.stringify(before)) }));
    act(() => channels[0].handlers.onChange());
    await flush();
    expect(result.current.status).toBe('countdown');
    expect(result.current.view!.match.level).toBe(before);
  });

  it('drops an older reply that lands after a newer one', async () => {
    const { deps, state, channels } = fakeDeps(viewOf(matchRow({ status: 'pending', starts_at: null, ends_at: null })));
    let releaseFirst: () => void = () => {};
    deps.getMatch = vi.fn()
      .mockImplementationOnce(() => new Promise(resolve => { releaseFirst = () => resolve(ok(viewOf(matchRow({ status: 'pending', starts_at: null, ends_at: null })))); }))
      .mockImplementation(async () => ok(state.view));
    const { result } = renderHook(() => useMatch('m1', 'me', deps));
    state.view = viewOf(matchRow({ status: 'done', winner_id: 'me' }));
    act(() => channels[0].handlers.onChange());
    await flush();
    expect(result.current.status).toBe('done');
    releaseFirst();
    await flush();
    expect(result.current.status).toBe('done');
  });
});

describe('useMatch: the clock', () => {
  it('counts down to the start, then runs the match clock', async () => {
    const { deps } = fakeDeps(viewOf(matchRow()));
    const { result } = renderHook(() => useMatch('m1', 'me', deps));
    await flush();
    expect(result.current.status).toBe('countdown');
    expect(result.current.countdown).toBe(2_000);

    await advance(2_250);
    expect(result.current.status).toBe('live');
    expect(result.current.countdown).toBe(0);
    expect(result.current.remaining).toBeLessThanOrEqual(END - START);
    expect(result.current.remaining).toBeGreaterThan(END - START - 1_000);
  });

  it('asks the server to settle the match once the clock runs out, and keeps asking while it is still open', async () => {
    vi.setSystemTime(END - 500);
    const { deps, state } = fakeDeps(viewOf(matchRow()));
    renderHook(() => useMatch('m1', 'me', deps));
    await flush();
    await advance(1_000);
    expect(deps.closeExpired).toHaveBeenCalledTimes(1);
    await advance(2_000);
    expect(vi.mocked(deps.closeExpired).mock.calls.length).toBeGreaterThanOrEqual(2);

    state.view = viewOf(matchRow({ status: 'done', winner_id: 'me' }));
    await advance(2_000);
    const calls = vi.mocked(deps.closeExpired).mock.calls.length;
    await advance(10_000);
    expect(vi.mocked(deps.closeExpired).mock.calls.length).toBe(calls);
  });

  it('does not ask while there is time left', async () => {
    vi.setSystemTime(START + 1_000);
    const { deps } = fakeDeps(viewOf(matchRow()));
    renderHook(() => useMatch('m1', 'me', deps));
    await flush();
    await advance(5_000);
    expect(deps.closeExpired).not.toHaveBeenCalled();
  });
});

describe('useMatch: the opponent', () => {
  it('shows their progress, ignoring anyone else\'s', async () => {
    const { deps, channels } = fakeDeps(viewOf(matchRow()));
    const { result } = renderHook(() => useMatch('m1', 'me', deps));
    await flush();
    act(() => channels[0].handlers.onProgress('you', 3));
    expect(result.current.opponentCovered).toBe(3);
    act(() => channels[0].handlers.onProgress('me', 9));
    expect(result.current.opponentCovered).toBe(3);
  });

  it('passes your own progress to the channel', async () => {
    const { deps, channels } = fakeDeps(viewOf(matchRow()));
    const { result } = renderHook(() => useMatch('m1', 'me', deps));
    await flush();
    result.current.sendProgress(2);
    expect(channels[0].sendProgress).toHaveBeenCalledWith(2);
  });

  it('calls the opponent gone only after the grace period, and starts it again when they come back and leave', async () => {
    vi.setSystemTime(START);
    const { deps, channels } = fakeDeps(viewOf(matchRow()));
    const { result } = renderHook(() => useMatch('m1', 'me', deps));
    await flush();
    expect(result.current.status).toBe('live');

    await advance(MATCH_GRACE_MS - 1_000);
    expect(result.current.opponentGone).toBe(false);
    await advance(1_500);
    expect(result.current.opponentGone).toBe(true);

    act(() => channels[0].handlers.onPresence(['me', 'you']));
    expect(result.current.opponentGone).toBe(false);

    act(() => channels[0].handlers.onPresence(['me']));
    await advance(MATCH_GRACE_MS - 1_000);
    expect(result.current.opponentGone).toBe(false);
    await advance(1_500);
    expect(result.current.opponentGone).toBe(true);
  });

  it('does not call them gone while the countdown has not finished', async () => {
    const { deps } = fakeDeps(viewOf(matchRow()));
    const { result } = renderHook(() => useMatch('m1', 'me', deps));
    await flush();
    await advance(1_500);
    expect(result.current.status).toBe('countdown');
    expect(result.current.opponentGone).toBe(false);
  });
});

describe('useMatch: acting', () => {
  it('sends the cats, takes the server\'s match as the new truth and reads again', async () => {
    vi.setSystemTime(START + 1_000);
    const { deps, state } = fakeDeps(viewOf(matchRow()));
    const done = matchRow({ status: 'done', winner_id: 'me' });
    deps.submit = vi.fn(async () => { state.view = viewOf(done, [playerRow('me', { cats_used: 1, result: 'won' }), playerRow('you', { result: 'lost' })]); return ok(done); });
    const { result } = renderHook(() => useMatch('m1', 'me', deps));
    await flush();

    await act(async () => { await result.current.submit([1]); });
    expect(deps.submit).toHaveBeenCalledWith('m1', [1]);
    expect(result.current.status).toBe('done');
    expect(result.current.view?.players.find(p => p.user_id === 'me')?.result).toBe('won');
  });

  it('keeps the match as it was when the server refuses', async () => {
    vi.setSystemTime(START + 1_000);
    const { deps } = fakeDeps(viewOf(matchRow()));
    deps.submit = vi.fn(async () => ({ ok: false as const, error: 'those cats do not cover every cable' }));
    const { result } = renderHook(() => useMatch('m1', 'me', deps));
    await flush();
    let reply;
    await act(async () => { reply = await result.current.submit([0]); });
    expect(reply).toEqual({ ok: false, error: 'those cats do not cover every cable' });
    expect(result.current.status).toBe('live');
  });

  it('forfeits through the server', async () => {
    const { deps } = fakeDeps(viewOf(matchRow()));
    const { result } = renderHook(() => useMatch('m1', 'me', deps));
    await flush();
    await act(async () => { await result.current.forfeit(); });
    expect(deps.forfeit).toHaveBeenCalledWith('m1');
  });
});
