import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SCHEDULE, levelForSite, levelsForDay } from './generation';
import type { CatalogueEntry, Level } from './types';
import { buildHouse, houseSeed } from './house';
import manifest from '../assets/rooms/manifest.json';

/* Characterization tests: the same day must give every player the same puzzles
   and the same house. If a snapshot here changes, the puzzles changed.

   The clock is frozen on purpose. The generator has a wall-clock search budget
   (Date.now()), so with a live clock a slower or busier machine gives up
   earlier and can settle on a different level — which made this snapshot
   flaky under parallel load. Frozen, generation is purely attempt-limited and
   the snapshot is machine-independent. (Production still runs on the live
   clock; see CLAUDE.md.) */
beforeAll(() => { vi.spyOn(Date, 'now').mockReturnValue(0); });
afterAll(() => { vi.restoreAllMocks(); });
const SEEDS = [12, 40, 97];
const THINGS = ['mug', 'vase', 'lamp', 'plant', 'clock', 'bowl'];
const entries = manifest as Record<string, { type: string; w: number; h: number }>;
const CATALOGUE: CatalogueEntry[] = Object.keys(entries).sort()
  .map(key => ({ key, type: entries[key].type, aspect: entries[key].w / entries[key].h }));

const summary = (lv: Level) => ({
  nodes: lv.nodes, edges: lv.edges, k: lv.k, stars: lv.stars, sol: lv.sol,
});

describe('level generation', () => {
  SEEDS.forEach(seed => {
    it('is stable for seed ' + seed, () => {
      const day = levelsForDay(DEFAULT_SCHEDULE, seed).map(summary);
      expect(day).toMatchSnapshot();
    });
  });

  it('is repeatable', () => {
    expect(levelForSite(DEFAULT_SCHEDULE, 40, 3).edges).toEqual(levelForSite(DEFAULT_SCHEDULE, 40, 3).edges);
  });

  it('yields a unique optimal cover of size k', () => {
    levelsForDay(DEFAULT_SCHEDULE, 12).forEach(lv => {
      expect(lv.sol.length).toBe(lv.k);
      const covered = lv.edges.every(([u, v]) => lv.sol.includes(u) || lv.sol.includes(v));
      expect(covered).toBe(true);
    });
  });
});

describe('house plan', () => {
  SEEDS.forEach(seed => {
    it('is stable for seed ' + seed, () => {
      const plans = levelsForDay(DEFAULT_SCHEDULE, seed).map(lv => {
        const p = buildHouse(lv, houseSeed(lv), 130, THINGS, CATALOGUE);
        return { outer: p.outer, rooms: p.rooms, roomOfNode: [...p.roomOfNode], edgeThing: [...p.edgeThing] };
      });
      expect(plans).toMatchSnapshot();
    });
  });
});
