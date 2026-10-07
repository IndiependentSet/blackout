import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SURVIVAL_LIMIT_MS } from '../domain/survival';
import type { Level } from '../domain/types';
import { mockLevelSource } from '../services/levels/mockLevelSource';
import { fail, ok } from '../services/result';
import type { SurvivalRecorderRepo } from './hooks/useSurvivalRecorder';
import { initialGameState } from './state/gameReducer';
import { runReducer, useSurvivalSession } from './useSurvivalSession';

const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });
const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

function setup() {
  const source = { getLevel: vi.fn(req => mockLevelSource.getLevel(req)) };
  const hook = renderHook(() => useSurvivalSession(source, () => 'seed-1'));
  return { source, ...hook };
}
const clearBoard = (result: { current: ReturnType<typeof useSurvivalSession> }) => {
  const lv = result.current.level as Level;
  for (const node of lv.sol) act(() => result.current.dispatch({ type: 'tap', node, lv }));
};

vi.mock('../services/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('../services/repositories/survival', () => ({ startSurvivalRun: vi.fn(), submitSurvivalSite: vi.fn() }));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useSurvivalSession', () => {
  it('is a one-site board with no hints, no invoice and no server save', async () => {
    const { result } = setup();
    expect(result.current.set).toMatchObject({ count: 1, open: true });
    expect(result.current.features).toEqual({ hints: false, invoice: false, share: false });
    expect(result.current.save).toBeNull();
    expect(result.current.state.results).toHaveLength(1);
    await flush();
    expect(result.current.level).not.toBeNull();
    expect(result.current.siteOffset).toBe(0);
  });

  it('holds the full clock until the first site is on the board, then counts down', async () => {
    const { result } = setup();
    expect(result.current.level).toBeNull();
    expect(result.current.remainingMs).toBe(SURVIVAL_LIMIT_MS);
    await flush();
    await advance(60_000);
    expect(result.current.remainingMs).toBe(SURVIVAL_LIMIT_MS - 60_000);
    expect(result.current.over).toBe(false);
  });

  it('asks the source for the open site and the one after it, under the run seed', async () => {
    const { result, source } = setup();
    await flush();
    expect(source.getLevel).toHaveBeenCalledWith({ mode: 'survival', runSeed: 'seed-1', step: 0 });
    expect(source.getLevel).toHaveBeenCalledWith({ mode: 'survival', runSeed: 'seed-1', step: 1 });
    clearBoard(result);
    await flush();
    expect(source.getLevel).toHaveBeenCalledWith({ mode: 'survival', runSeed: 'seed-1', step: 2 });
  });

  it('moves straight on to the next site after a clear, and banks the run', async () => {
    const { result } = setup();
    await flush();
    const first = result.current.level;
    clearBoard(result);
    await flush();
    expect(result.current.siteOffset).toBe(1);
    expect(result.current.summary).toMatchObject({ sites: 1, perfect: 1 });
    expect(result.current.summary.score).toBeGreaterThan(0);
    expect(result.current.state.placed).toEqual([]);
    expect(result.current.level).not.toBeNull();
    expect(result.current.level).not.toBe(first);
  });

  it('ends the run when the clock runs out, and stops counting clears after that', async () => {
    const { result } = setup();
    await flush();
    await advance(SURVIVAL_LIMIT_MS);
    expect(result.current.over).toBe(true);
    expect(result.current.remainingMs).toBe(0);

    clearBoard(result);
    await flush();
    expect(result.current.summary.sites).toBe(0);
    expect(result.current.siteOffset).toBe(0);
  });

  it('stops its timer when it is over and when it goes away', async () => {
    const { result, unmount } = setup();
    await flush();
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    await advance(SURVIVAL_LIMIT_MS);
    expect(result.current.over).toBe(true);
    expect(vi.getTimerCount()).toBe(0);

    const second = setup();
    await flush();
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    second.unmount();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('runReducer', () => {
  it('does not advance a run that has not cleared its site', () => {
    const s = { game: initialGameState(1), runs: [] };
    expect(runReducer(s, { type: 'advance' })).toBe(s);
  });

  it('advances once per clear, however many times it is asked', () => {
    const cleared = { game: { ...initialGameState(1), event: { seq: 1, kind: 'cleared' as const, node: 0, count: 1, gained: 1, prevScore: 0, consulted: 0 as const,
      run: { status: 'perfect', score: 20, best: 20, grade: 'S', used: 1, par: 1, stars: 2, rows: [] } as never } }, runs: [] };
    const next = runReducer(cleared, { type: 'advance' });
    expect(next.runs).toHaveLength(1);
    expect(next.game.event).toMatchObject({ kind: 'entered', seq: 2 });
    expect(runReducer(next, { type: 'advance' })).toBe(next);
  });
});

describe('useSurvivalSession on the server', () => {
  const okRepo = (): SurvivalRecorderRepo => ({
    start: vi.fn(async () => ok('run-1')),
    submit: vi.fn(async () => ok({ sites: 1, perfect: 1, score: 20 })),
  });
  const signedIn = (repo: SurvivalRecorderRepo) => {
    const source = { getLevel: vi.fn(req => mockLevelSource.getLevel(req)) };
    return renderHook(() => useSurvivalSession(source, () => 'seed-1', 'u1', repo));
  };

  it('stays local for a signed-out player', async () => {
    const { result } = setup();
    await flush();
    expect(result.current.recording).toBe('local');
    expect(result.current.recorded).toBe(true);
  });

  it('opens the run as soon as the first site is on the board', async () => {
    const repo = okRepo();
    const { result } = signedIn(repo);
    expect(repo.start).not.toHaveBeenCalled();
    await flush();
    expect(repo.start).toHaveBeenCalledTimes(1);
    expect(result.current.recording).toBe('ranked');
  });

  it('banks each clear once, with the site, its level and the cats on the board', async () => {
    const repo = okRepo();
    const { result } = signedIn(repo);
    await flush();
    const first = result.current.level as Level;
    clearBoard(result);
    await flush();
    expect(repo.submit).toHaveBeenCalledTimes(1);
    expect(repo.submit).toHaveBeenLastCalledWith('run-1', 0, first, [...first.sol]);

    const second = result.current.level as Level;
    clearBoard(result);
    await flush();
    expect(repo.submit).toHaveBeenCalledTimes(2);
    expect(repo.submit).toHaveBeenLastCalledWith('run-1', 1, second, [...second.sol]);
    expect(repo.start).toHaveBeenCalledTimes(1);
  });

  it('does not bank a clear that lands after the clock ran out', async () => {
    const repo = okRepo();
    const { result } = signedIn(repo);
    await flush();
    await advance(SURVIVAL_LIMIT_MS);
    clearBoard(result);
    await flush();
    expect(repo.submit).not.toHaveBeenCalled();
  });

  it('keeps playing when the server refuses, and says the run is not saved', async () => {
    const repo: SurvivalRecorderRepo = { start: vi.fn(async () => fail('no such function')), submit: vi.fn() };
    const { result } = signedIn(repo);
    await flush();
    expect(result.current.recording).toBe('unsaved');
    clearBoard(result);
    await flush();
    expect(result.current.summary.sites).toBe(1);
    expect(result.current.siteOffset).toBe(1);
    expect(repo.submit).not.toHaveBeenCalled();
  });
});
