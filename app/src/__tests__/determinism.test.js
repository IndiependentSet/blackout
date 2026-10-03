import { describe, expect, it } from 'vitest';
import * as E from '../engine.js';
import { buildHouse, houseSeed } from '../house.js';
import manifest from '../assets/rooms/manifest.json';

/* Characterization tests: the same day must give every player the same puzzles
   and the same house. If a snapshot here changes, the puzzles changed. */
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
