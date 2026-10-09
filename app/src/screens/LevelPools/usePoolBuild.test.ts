import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { poolSlots, type LevelCurve } from '../../domain/generation';
import type { Level } from '../../domain/types';
import { fail, ok } from '../../services/result';
import type { SlotResult } from '../../services/generation/poolClient';
import { publishBlockers, usePoolBuild } from './usePoolBuild';

const curve: LevelCurve = { version: 1, seed: 1, retries: 2, fallback: { diff: 1, options: {} },
  tiers: [{ count: 3, size: 4, diff: 1, options: {} }] };
const fake = (unique = true) => vi.fn(async (_c: LevelCurve, slot: { slot: number; tier: number }) =>
  ok({ ...slot, level: {} as Level, salt: 0, unique, ms: 1 } satisfies SlotResult));

describe('usePoolBuild', () => {
  it('builds every slot, in order, and finishes', async () => {
    const gen = fake();
    const { result } = renderHook(() => usePoolBuild('survival', curve, gen));
    await act(async () => { await result.current.start(); });
    expect(gen).toHaveBeenCalledTimes(3);
    expect(result.current.build?.status).toBe('done');
    expect(result.current.build?.results.map(r => r.slot)).toEqual(poolSlots('survival', curve).map(s => s.slot));
    expect(publishBlockers(result.current.build, result.current.current)).toEqual([]);
  });

  it('stops on the first failure and says why', async () => {
    const gen = vi.fn(async () => fail('worker died'));
    const { result } = renderHook(() => usePoolBuild('match', curve, gen as never));
    await act(async () => { await result.current.start(); });
    expect(result.current.build).toMatchObject({ status: 'error', error: 'worker died' });
    expect(gen).toHaveBeenCalledTimes(1);
  });

  it('marks a build stale once the curve changes', async () => {
    const gen = fake();
    const { result, rerender } = renderHook(({ c }) => usePoolBuild('survival', c, gen), { initialProps: { c: curve } });
    await act(async () => { await result.current.start(); });
    rerender({ c: { ...curve, seed: 2 } });
    expect(result.current.current).toBe(false);
    expect(publishBlockers(result.current.build, result.current.current)[0]).toMatch(/changed/);
  });

  it('will not publish a level without a unique cover', async () => {
    const { result } = renderHook(() => usePoolBuild('survival', curve, fake(false)));
    await act(async () => { await result.current.start(); });
    expect(publishBlockers(result.current.build, result.current.current)[0]).toMatch(/3 levels/);
  });

  it('stop() ends a run that is still going', async () => {
    let release: () => void = () => {};
    const gen = vi.fn((_c: LevelCurve, slot: { slot: number; tier: number }, o?: { signal?: AbortSignal }) =>
      new Promise<ReturnType<typeof ok<SlotResult>>>(res => { release = () => res(ok({ ...slot, level: {} as Level, salt: 0, unique: true, ms: 1 })); void o; }));
    const { result } = renderHook(() => usePoolBuild('survival', curve, gen as never));
    let p: Promise<void> = Promise.resolve();
    act(() => { p = result.current.start(); });
    act(() => result.current.stop());
    expect(result.current.build?.status).toBe('stopped');
    release();
    await act(async () => { await p; });
    expect(result.current.build?.status).toBe('stopped');
  });
});
