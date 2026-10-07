import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RunSummary } from '../../domain/survival';
import type { Level } from '../../domain/types';
import { fail, ok, type Result } from '../../services/result';
import { useSurvivalRecorder, type SurvivalRecorderRepo } from './useSurvivalRecorder';

vi.mock('../../services/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('../../services/repositories/survival', () => ({ startSurvivalRun: vi.fn(), submitSurvivalSite: vi.fn() }));

const level = { k: 2, stars: 1 } as Level;
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

/* A repo whose answers the test releases by hand. */
function deferredRepo() {
  const starts: ((r: Result<string>) => void)[] = [];
  const submits: ((r: Result<RunSummary>) => void)[] = [];
  const repo: SurvivalRecorderRepo = {
    start: vi.fn(() => new Promise<Result<string>>(res => { starts.push(res); })),
    submit: vi.fn(() => new Promise<Result<RunSummary>>(res => { submits.push(res); })),
  };
  return { repo, starts, submits };
}

describe('useSurvivalRecorder', () => {
  it('does nothing for a signed-out player', async () => {
    const { repo } = deferredRepo();
    const { result } = renderHook(() => useSurvivalRecorder(null, repo));
    act(() => { result.current.begin(); result.current.record(0, level, [1, 2]); });
    await flush();
    expect(repo.start).not.toHaveBeenCalled();
    expect(repo.submit).not.toHaveBeenCalled();
    expect(result.current.status).toBe('local');
    expect(result.current.settled).toBe(true);
  });

  it('opens the run once, however many times it is asked', async () => {
    const { repo, starts } = deferredRepo();
    const { result } = renderHook(() => useSurvivalRecorder('u1', repo));
    act(() => { result.current.begin(); result.current.begin(); });
    expect(repo.start).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('syncing');
    expect(result.current.settled).toBe(false);
    starts[0](ok('run-1'));
    await flush();
    expect(result.current.status).toBe('ranked');
    expect(result.current.settled).toBe(true);
  });

  it('submits each site under the run id, one at a time and in order', async () => {
    const { repo, starts, submits } = deferredRepo();
    const { result } = renderHook(() => useSurvivalRecorder('u1', repo));
    act(() => { result.current.begin(); result.current.record(0, level, [1, 2]); result.current.record(1, level, [3, 4]); });
    expect(repo.submit).not.toHaveBeenCalled();

    starts[0](ok('run-1'));
    await flush();
    expect(repo.submit).toHaveBeenCalledTimes(1);
    expect(repo.submit).toHaveBeenLastCalledWith('run-1', 0, level, [1, 2]);

    submits[0](ok({ sites: 1, perfect: 1, score: 10 }));
    await flush();
    expect(repo.submit).toHaveBeenCalledTimes(2);
    expect(repo.submit).toHaveBeenLastCalledWith('run-1', 1, level, [3, 4]);
    expect(result.current.settled).toBe(false);

    submits[1](ok({ sites: 2, perfect: 2, score: 20 }));
    await flush();
    expect(result.current.status).toBe('ranked');
    expect(result.current.settled).toBe(true);
  });

  it('turns unsaved, and stops submitting, when the run could not be opened', async () => {
    const { repo, starts } = deferredRepo();
    const { result } = renderHook(() => useSurvivalRecorder('u1', repo));
    act(() => { result.current.begin(); result.current.record(0, level, [1]); });
    starts[0](fail('relation "survival_runs" does not exist'));
    await flush();
    expect(result.current.status).toBe('unsaved');
    expect(result.current.settled).toBe(true);
    expect(repo.submit).not.toHaveBeenCalled();
  });

  it('turns unsaved on a refused site and does not send the ones after it', async () => {
    const { repo, starts, submits } = deferredRepo();
    const { result } = renderHook(() => useSurvivalRecorder('u1', repo));
    act(() => { result.current.begin(); result.current.record(0, level, [1]); result.current.record(1, level, [2]); });
    starts[0](ok('run-1'));
    await flush();
    submits[0](fail('survival run is over'));
    await flush();
    expect(result.current.status).toBe('unsaved');
    expect(repo.submit).toHaveBeenCalledTimes(1);
    expect(result.current.settled).toBe(true);
  });

  it('survives a repository that throws', async () => {
    const repo: SurvivalRecorderRepo = {
      start: vi.fn(async () => ok('run-1')),
      submit: vi.fn(async () => { throw new Error('network down'); }),
    };
    const { result } = renderHook(() => useSurvivalRecorder('u1', repo));
    act(() => { result.current.record(0, level, [1]); });
    await flush();
    expect(result.current.status).toBe('unsaved');
  });

  it('ignores an answer that lands after the screen has gone', async () => {
    const { repo, starts } = deferredRepo();
    const { result, unmount } = renderHook(() => useSurvivalRecorder('u1', repo));
    act(() => result.current.begin());
    unmount();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    starts[0](ok('run-1'));
    await flush();
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
