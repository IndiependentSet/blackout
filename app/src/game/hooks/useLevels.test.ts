import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SCHEDULE, generate } from '../../domain/generation';
import type { Level } from '../../domain/types';
import { fail, ok } from '../../services/result';
import { useLevels } from './useLevels';

const lvl = (seed: number): Level => generate({ seed, size: 6, diff: 1, options: { clock: false } }).level as Level;
const builder = () => vi.fn(async (_s: unknown, seed: number, idx: number) => ok(lvl(seed + idx)));

describe('useLevels', () => {
  it('starts with nothing and builds the week one site at a time, in order', async () => {
    const build = builder();
    const { result } = renderHook(() => useLevels(12, DEFAULT_SCHEDULE, build as never));
    expect(result.current.every(l => l === null)).toBe(true);
    await waitFor(() => expect(result.current.every(l => l !== null)).toBe(true));
    expect(result.current).toHaveLength(7);
    expect(build.mock.calls.map(c => c[2])).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(result.current[3]).toEqual(lvl(15));
  });

  it('never has two sites building at once', async () => {
    let running = 0, peak = 0;
    const build = vi.fn(async (_s: unknown, seed: number, idx: number) => {
      peak = Math.max(peak, ++running);
      await Promise.resolve();
      running--;
      return ok(lvl(seed + idx));
    });
    const { result } = renderHook(() => useLevels(12, DEFAULT_SCHEDULE, build as never));
    await waitFor(() => expect(result.current[6]).not.toBeNull());
    expect(peak).toBe(1);
  });

  it('stops building when unmounted', async () => {
    /* the first site finishes only once the test says so, after the unmount: no timer to race on a slow machine */
    const signals: AbortSignal[] = [];
    let finish: () => void = () => {};
    const build = vi.fn((_s: unknown, seed: number, idx: number, o?: { signal?: AbortSignal }) => {
      if (o?.signal) signals.push(o.signal);
      return new Promise<ReturnType<typeof ok<Level>>>(res => { finish = () => res(ok(lvl(seed + idx))); });
    });
    const { unmount } = renderHook(() => useLevels(12, DEFAULT_SCHEDULE, build as never));
    await waitFor(() => expect(build).toHaveBeenCalledTimes(1));
    unmount();
    expect(signals[0].aborted).toBe(true);
    await act(async () => { finish(); await new Promise(r => setTimeout(r, 30)); });
    expect(build).toHaveBeenCalledTimes(1);
  });

  it('waits for the schedule', async () => {
    const build = builder();
    const { result, rerender } = renderHook(({ s }) => useLevels(12, s, build as never), { initialProps: { s: null as typeof DEFAULT_SCHEDULE | null } });
    await act(async () => { await new Promise(r => setTimeout(r, 20)); });
    expect(build).not.toHaveBeenCalled();
    rerender({ s: DEFAULT_SCHEDULE });
    await waitFor(() => expect(result.current[0]).not.toBeNull());
  });

  it('leaves a site that fails to build empty and carries on', async () => {
    const build = vi.fn(async (_s: unknown, seed: number, idx: number) => (idx === 1 ? fail('worker died') : ok(lvl(seed + idx))));
    const { result } = renderHook(() => useLevels(12, DEFAULT_SCHEDULE, build as never));
    await waitFor(() => expect(result.current[6]).not.toBeNull());
    expect(result.current[1]).toBeNull();
    expect(result.current[0]).not.toBeNull();
  });
});
