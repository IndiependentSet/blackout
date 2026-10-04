import { describe, expect, it } from 'vitest';
import type { Hint, Level } from '../../domain/types';
import { gameReducer, initialGameState, REFUSED_MSG, type GameState } from './gameReducer';

/* a path 0-1-2-3: the unique optimal cover is {1, 2}, so par is 2 */
const lv: Level = {
  nodes: [{ c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }, { c: 3, r: 0 }],
  edges: [[0, 1], [1, 2], [2, 3]], adj: [[1], [0, 2], [1, 3], [2]], k: 2, sol: [1, 2], stars: 2,
};
const tap = (s: GameState, node: number) => gameReducer(s, { type: 'tap', node, lv });
const run = (...nodes: number[]) => nodes.reduce(tap, initialGameState());

describe('tapping a pad', () => {
  it('hires a cat and reports how many paths it took out', () => {
    const s = run(1);
    expect(s.placed).toEqual([1]);
    expect(s.focus).toBe(1);
    expect(s.event).toMatchObject({ kind: 'hired', node: 1, count: 1, gained: 2 });
  });

  it('recalls a cat that is already there', () => {
    const s = tap(run(1, 0), 0);
    expect(s.placed).toEqual([1]);
    expect(s.event).toMatchObject({ kind: 'recalled', count: 2 });
  });

  it('clears the site on budget and scores it', () => {
    const s = run(1, 2);
    expect(s.event).toMatchObject({ kind: 'cleared', count: 2, run: { status: 'perfect', score: 20, grade: 'S' } });
    expect(s.results[0]).toMatchObject({ score: 20 });
  });

  it('refuses a cat beyond one over par', () => {
    /* three separate paths but a (made-up) par of 1: the second cat is the
       one allowed over par, a third is refused while the site is still open */
    const apart: Level = {
      nodes: Array.from({ length: 6 }, (_, c) => ({ c, r: 0 })),
      edges: [[0, 1], [2, 3], [4, 5]], adj: [[1], [0], [3], [2], [5], [4]], k: 1, sol: [0, 2, 4], stars: 1,
    };
    const hire = (s: GameState, node: number) => gameReducer(s, { type: 'tap', node, lv: apart });
    const two = hire(hire(initialGameState(), 0), 2);
    expect(two.placed).toEqual([0, 2]);
    const refused = hire(two, 1);                 // pad 1 only re-covers path 0-1: still open, so no
    expect(refused.placed).toEqual([0, 2]);
    expect(refused.msg).toBe(REFUSED_MSG);
    expect(refused.event?.kind).toBe('refused');
  });

  it('ignores taps once the site is cleared', () => {
    const done = run(1, 2);
    expect(tap(done, 0)).toBe(done);
  });

  it('keeps the best result across replays', () => {
    const good = run(1, 2);
    const replay = gameReducer(good, { type: 'reset' });
    const worse = [0, 1, 2].reduce(tap, replay);       // three cats: over par, lower score
    expect(worse.results[0]?.score).toBe(20);
    expect(worse.event).toMatchObject({ kind: 'cleared', prevScore: 20 });
  });

  it('drops a revealed hint when its cat is recalled, but keeps other hints', () => {
    const revealed: Hint = { kind: 'reveal', node: 2 };
    const proof: Hint = { kind: 'proof', edges: [0] };
    expect(tap({ ...run(1), hint: revealed }, 1).hint).toBeNull();
    expect(tap({ ...run(1), hint: proof }, 1).hint).toEqual(proof);
  });

  it('numbers its events so consumers can react once each', () => {
    const a = run(1), b = tap(a, 2);
    expect(b.event!.seq).toBe(a.event!.seq + 1);
  });
});

describe('other actions', () => {
  it('reset recalls everyone', () => {
    const s = gameReducer(run(1), { type: 'reset' });
    expect(s).toMatchObject({ placed: [], hint: null, msg: '', focus: 0 });
    expect(s.event?.kind).toBe('reset');
  });
  it('go opens another site and clears the board, but only for real sites', () => {
    const s = gameReducer(run(1), { type: 'go', idx: 3 });
    expect(s).toMatchObject({ idx: 3, placed: [] });
    expect(gameReducer(s, { type: 'go', idx: 7 })).toBe(s);
    expect(gameReducer(s, { type: 'go', idx: -1 })).toBe(s);
  });
  it('consult sets a hint and a message', () => {
    const s = gameReducer(initialGameState(), { type: 'consult', tier: 2, lv });
    expect(s.hint).toMatchObject({ kind: 'proof' });
    expect(s.msg).toContain('CATS MINIMUM');
  });
  it('keyboard only flips once', () => {
    const a = gameReducer(initialGameState(), { type: 'keyboard' });
    expect(a.kbd).toBe(true);
    expect(gameReducer(a, { type: 'keyboard' })).toBe(a);
  });
});
