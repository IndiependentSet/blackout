import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Level, LevelRequest } from '../../domain/types';
import type { LevelSource } from '../../services/levels';
import { BASE_MAPS } from '../../services/levels/fixtures/baseMaps';
import { fail, ok } from '../../services/result';
import type { Result } from '../../services/result';
import { useSourcedLevel } from './useSourcedLevel';

const deferred = () => {
  let resolve!: (r: Result<Level>) => void;
  const promise = new Promise<Result<Level>>(res => { resolve = res; });
  return { promise, resolve };
};

describe('useSourcedLevel', () => {
  it('loads the level for a request', async () => {
    const source: LevelSource = { getLevel: () => Promise.resolve(ok(BASE_MAPS[0])) };
    const { result } = renderHook(() => useSourcedLevel({ mode: 'campaign', levelNo: 1 }, source));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toBe(BASE_MAPS[0]));
    expect(result.current.loading).toBe(false);
  });

  it('holds off while the request is null', () => {
    let calls = 0;
    const source: LevelSource = { getLevel: () => { calls++; return Promise.resolve(ok(BASE_MAPS[0])); } };
    const { result } = renderHook(() => useSourcedLevel(null, source));
    expect(calls).toBe(0);
    expect(result.current.loading).toBe(false);
  });

  it('surfaces a failed load as an error', async () => {
    const source: LevelSource = { getLevel: () => Promise.resolve(fail('nope')) };
    const { result } = renderHook(() => useSourcedLevel({ mode: 'campaign', levelNo: 1 }, source));
    await waitFor(() => expect(result.current.error).toBe('nope'));
  });

  it('ignores a stale reply for a request the screen moved off', async () => {
    const slow = deferred();
    const fast = deferred();
    const source: LevelSource = {
      getLevel: (req: LevelRequest) => (req.mode === 'campaign' && req.levelNo === 1 ? slow.promise : fast.promise),
    };
    const { result, rerender } = renderHook(({ n }) => useSourcedLevel({ mode: 'campaign', levelNo: n }, source), { initialProps: { n: 1 } });
    rerender({ n: 2 });
    await act(async () => { fast.resolve(ok(BASE_MAPS[1])); });
    await waitFor(() => expect(result.current.data).toBe(BASE_MAPS[1]));
    await act(async () => { slow.resolve(ok(BASE_MAPS[2])); });
    expect(result.current.data).toBe(BASE_MAPS[1]);
  });
});
