import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { fail, ok, type Result } from '../services/result';
import { useResource } from './useResource';

const deferred = <T,>() => {
  let resolve!: (r: Result<T>) => void;
  const promise = new Promise<Result<T>>(r => { resolve = r; });
  return { promise, resolve };
};

describe('useResource', () => {
  it('loads data for a key', async () => {
    const { result } = renderHook(() => useResource('a', () => Promise.resolve(ok(1))));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toBe(1));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('surfaces a failure as an error', async () => {
    const { result } = renderHook(() => useResource('a', () => Promise.resolve(fail('nope'))));
    await waitFor(() => expect(result.current.error).toBe('nope'));
    expect(result.current.data).toBeUndefined();
  });

  it('waits while the key is null', () => {
    const { result } = renderHook(() => useResource(null, () => Promise.resolve(ok(1))));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('ignores a slow answer for a key the caller has moved off', async () => {
    const slow = deferred<string>(), fast = deferred<string>();
    const { result, rerender } = renderHook(({ k }) => useResource(k, () => (k === 'slow' ? slow : fast).promise), { initialProps: { k: 'slow' } });
    rerender({ k: 'fast' });
    await act(async () => { fast.resolve(ok('fast')); });
    await waitFor(() => expect(result.current.data).toBe('fast'));
    await act(async () => { slow.resolve(ok('slow')); });
    expect(result.current.data).toBe('fast');
  });

  it('reloads on demand', async () => {
    let n = 0;
    const { result } = renderHook(() => useResource('a', () => Promise.resolve(ok(++n))));
    await waitFor(() => expect(result.current.data).toBe(1));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.data).toBe(2));
  });
});
