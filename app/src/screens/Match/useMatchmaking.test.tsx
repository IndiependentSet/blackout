import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fail, ok } from '../../services/result';
import { SEARCH_GIVE_UP_MS, SEARCH_POLL_MS, useMatchmaking, type SearchDeps } from './useMatchmaking';

vi.mock('../../services/supabase/client', () => ({ supabase: {}, APP_BASE_URL: 'http://localhost' }));

let clock = 0;
function deps(answers: Array<ReturnType<typeof ok<string | null>> | ReturnType<typeof fail>>): SearchDeps {
  let i = 0;
  return {
    find: vi.fn(async () => answers[Math.min(i++, answers.length - 1)] as never),
    leave: vi.fn(async () => ok(null)),
    now: () => clock,
  };
}
const flush = () => act(async () => { await Promise.resolve(); });

beforeEach(() => { vi.useFakeTimers(); clock = 0; });
afterEach(() => { vi.useRealTimers(); });

describe('useMatchmaking', () => {
  it('asks straight away and hands over a match it finds', async () => {
    const d = deps([ok('m1')]);
    const onFound = vi.fn();
    const { result } = renderHook(() => useMatchmaking(onFound, d));
    act(() => result.current.start(1));
    await flush();
    expect(d.find).toHaveBeenCalledWith(1);
    expect(onFound).toHaveBeenCalledWith('m1');
    expect(result.current.search).toEqual({ status: 'idle' });
    expect(d.leave).not.toHaveBeenCalled();     // the server already took them out of the queue
  });

  it('keeps asking while nobody is there, and finds the match when it turns up', async () => {
    const d = deps([ok(null), ok(null), ok('m2')]);
    const onFound = vi.fn();
    const { result } = renderHook(() => useMatchmaking(onFound, d));
    act(() => result.current.start(0));
    await flush();
    expect(result.current.search.status).toBe('searching');
    await act(async () => { await vi.advanceTimersByTimeAsync(SEARCH_POLL_MS); });
    expect(d.find).toHaveBeenCalledTimes(2);
    await act(async () => { await vi.advanceTimersByTimeAsync(SEARCH_POLL_MS); });
    expect(onFound).toHaveBeenCalledWith('m2');
    expect(d.find).toHaveBeenCalledTimes(3);
  });

  it('leaves the queue when cancelled, and asks no more', async () => {
    const d = deps([ok(null)]);
    const { result } = renderHook(() => useMatchmaking(vi.fn(), d));
    act(() => result.current.start(0));
    await flush();
    act(() => result.current.cancel());
    expect(d.leave).toHaveBeenCalledOnce();
    expect(result.current.search).toEqual({ status: 'idle' });
    await act(async () => { await vi.advanceTimersByTimeAsync(SEARCH_POLL_MS * 3); });
    expect(d.find).toHaveBeenCalledTimes(1);
  });

  it('gives up after a minute and leaves the queue', async () => {
    const d = deps([ok(null)]);
    const { result } = renderHook(() => useMatchmaking(vi.fn(), d));
    act(() => result.current.start(0));
    await flush();
    clock = SEARCH_GIVE_UP_MS;
    await act(async () => { await vi.advanceTimersByTimeAsync(SEARCH_POLL_MS); });
    expect(result.current.search).toEqual({ status: 'timeout' });
    expect(d.leave).toHaveBeenCalledOnce();
  });

  it('reports a failure and stops', async () => {
    const d = deps([fail('NO MATCH LEVELS PUBLISHED')]);
    const { result } = renderHook(() => useMatchmaking(vi.fn(), d));
    act(() => result.current.start(0));
    await flush();
    expect(result.current.search).toEqual({ status: 'error', message: 'NO MATCH LEVELS PUBLISHED' });
    await act(async () => { await vi.advanceTimersByTimeAsync(SEARCH_POLL_MS * 2); });
    expect(d.find).toHaveBeenCalledTimes(1);
  });

  it('leaves the queue when the screen goes away mid-search', async () => {
    const d = deps([ok(null)]);
    const { result, unmount } = renderHook(() => useMatchmaking(vi.fn(), d));
    act(() => result.current.start(0));
    await flush();
    unmount();
    expect(d.leave).toHaveBeenCalledOnce();
  });

  it('ignores an answer that arrives after the search was cancelled', async () => {
    let answer: (v: unknown) => void = () => {};
    const d: SearchDeps = { find: vi.fn(() => new Promise(r => { answer = r; }) as never), leave: vi.fn(async () => ok(null)), now: () => clock };
    const onFound = vi.fn();
    const { result } = renderHook(() => useMatchmaking(onFound, d));
    act(() => result.current.start(0));
    act(() => result.current.cancel());
    await act(async () => { answer(ok('late')); await Promise.resolve(); });
    expect(onFound).not.toHaveBeenCalled();
  });
});
