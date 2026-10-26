import { describe, expect, it } from 'vitest';
import { maxMatching } from './matching';
import { hintMatching } from './hints';
import { rngFromSeed } from './rng';

type E = [number, number];
const cycle = (n: number): E[] => Array.from({ length: n }, (_, i) => [i, (i + 1) % n]);

/* the largest matching, by trying every edge in or out */
function bruteForce(n: number, edges: E[]): number {
  let best = 0;
  const used = new Uint8Array(n);
  const go = (i: number, size: number) => {
    if (size + (edges.length - i) <= best) return;
    if (i === edges.length) { best = size; return; }
    const [u, v] = edges[i];
    if (!used[u] && !used[v]) { used[u] = used[v] = 1; go(i + 1, size + 1); used[u] = used[v] = 0; }
    go(i + 1, size);
  };
  go(0, 0);
  return best;
}

const isMatching = (edges: E[], m: number[]) => {
  const ends = m.flatMap(i => edges[i]);
  return new Set(ends).size === ends.length;
};

describe('maxMatching', () => {
  it('handles the small cases', () => {
    expect(maxMatching(0, [])).toEqual([]);
    expect(maxMatching(3, [])).toEqual([]);
    expect(maxMatching(2, [[0, 1]])).toEqual([0]);
    expect(maxMatching(5, cycle(5))).toHaveLength(2);
    expect(maxMatching(7, cycle(7))).toHaveLength(3);
    expect(maxMatching(6, cycle(6))).toHaveLength(3);
  });

  it('finds the perfect matching of the Petersen graph', () => {
    const outer = cycle(5);
    const spokes: E[] = [0, 1, 2, 3, 4].map(i => [i, i + 5]);
    const inner: E[] = [0, 1, 2, 3, 4].map(i => [5 + i, 5 + ((i + 2) % 5)]);
    const edges = [...outer, ...spokes, ...inner];
    const m = maxMatching(10, edges);
    expect(m).toHaveLength(5);
    expect(isMatching(edges, m)).toBe(true);
  });

  it('beats greedy where greedy takes the wrong lines', () => {
    const path: E[] = [[1, 2], [0, 1], [2, 3]];
    expect(hintMatching({ edges: path })).toHaveLength(1);
    expect(maxMatching(4, path)).toHaveLength(2);
    /* a triangle 1-2-3 with a tail on each corner, greedy starting inside it */
    const flower: E[] = [[1, 2], [2, 3], [3, 1], [0, 1], [3, 4], [2, 5]];
    expect(hintMatching({ edges: flower })).toHaveLength(2);
    expect(maxMatching(6, flower)).toHaveLength(3);
  });

  it('ignores loops and repeated edges', () => {
    const m = maxMatching(3, [[0, 0], [0, 1], [1, 0], [1, 2]]);
    expect(m).toHaveLength(1);
    expect([1, 3]).toContain(m[0]);
  });

  it('matches brute force on 500 random graphs, and is a valid matching every time', () => {
    const rng = rngFromSeed(42);
    for (let t = 0; t < 500; t++) {
      const n = 1 + Math.floor(rng() * 10);
      const p = 0.15 + rng() * 0.5;
      const edges: E[] = [];
      for (let u = 0; u < n; u++) for (let v = u + 1; v < n; v++) if (rng() < p) edges.push(rng() < 0.5 ? [u, v] : [v, u]);
      const m = maxMatching(n, edges);
      expect(isMatching(edges, m)).toBe(true);
      expect(m.length).toBe(bruteForce(n, edges));
      expect(m.length).toBeGreaterThanOrEqual(hintMatching({ edges }).length);
    }
  });

  it('is deterministic', () => {
    const edges: E[] = [...cycle(9), [0, 4], [2, 7], [3, 8]];
    expect(maxMatching(9, edges)).toEqual(maxMatching(9, edges));
  });
});
