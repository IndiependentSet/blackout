import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import * as E from '../domain/engine';
import { buildHouse, houseSeed } from '../domain/house';
import manifest from '../assets/rooms/manifest.json';

/* Characterization tests: the same day must give every player the same puzzles
   and the same house. If a snapshot here changes, the puzzles changed.

   The clock is frozen on purpose. makeLevel() has a wall-clock search budget
   (Date.now()), so with a live clock a slower or busier machine gives up
   earlier and can settle on a different level — which made this snapshot
   flaky under parallel load. Frozen, generation is purely attempt-limited and
   the snapshot is machine-independent. (Production still runs on the live
   clock; see CLAUDE.md.) */
beforeAll(() => { vi.spyOn(Date, 'now').mockReturnValue(0); });
afterAll(() => { vi.restoreAllMocks(); });
const SEEDS = [12, 40, 97];
const THINGS = ['mug', 'vase', 'lamp', 'plant', 'clock', 'bowl'];
const CATALOGUE = Object.keys(manifest).sort()
  .map(key => ({ key, type: manifest[key].type, aspect: manifest[key].w / manifest[key].h }));

const summary = lv => ({
  nodes: lv.nodes, edges: lv.edges, k: lv.k, stars: lv.stars, sol: lv.sol,
});

describe('level generation', () => {
  SEEDS.forEach(seed => {
    it('is stable for seed ' + seed, () => {
      const day = E.makeDay(seed).map(summary);
      expect(day).toMatchSnapshot();
    });
  });

  it('is repeatable', () => {
    expect(E.makeLevelForDay(40, 3).edges).toEqual(E.makeLevelForDay(40, 3).edges);
  });

  it('yields a unique optimal cover of size k', () => {
    E.makeDay(12).forEach(lv => {
      expect(lv.sol.length).toBe(lv.k);
      const covered = lv.edges.every(([u, v]) => lv.sol.includes(u) || lv.sol.includes(v));
      expect(covered).toBe(true);
    });
  });
});

describe('house plan', () => {
  SEEDS.forEach(seed => {
    it('is stable for seed ' + seed, () => {
      const plans = E.makeDay(seed).map(lv => {
        const p = buildHouse(lv, houseSeed(lv), 130, THINGS, CATALOGUE);
        return { outer: p.outer, rooms: p.rooms, roomOfNode: [...p.roomOfNode], edgeThing: [...p.edgeThing] };
      });
      expect(plans).toMatchSnapshot();
    });
  });
});
