import { describe, expect, it } from 'vitest';
import { coveredEdges, isCleared } from '../../domain/cover';
import { solve } from '../../domain/engine';
import { CAMPAIGN_LEVELS } from '../../domain/types';
import type { LevelRequest } from '../../domain/types';
import { BASE_MAPS } from './fixtures/baseMaps';
import { mockLevelSource } from './mockLevelSource';

describe('BASE_MAPS', () => {
  it('has a few maps', () => { expect(BASE_MAPS.length).toBeGreaterThanOrEqual(3); });

  BASE_MAPS.forEach((lv, i) => {
    describe(`map ${i}`, () => {
      it('has adj consistent with edges', () => {
        const adj = lv.nodes.map(() => new Set<number>());
        for (const [a, b] of lv.edges) { adj[a].add(b); adj[b].add(a); }
        expect(lv.adj.map(a => [...a].sort())).toEqual(adj.map(s => [...s].sort()));
      });
      it('has nodes on distinct integer cells', () => {
        const keys = new Set(lv.nodes.map(n => `${n.c},${n.r}`));
        expect(keys.size).toBe(lv.nodes.length);
        expect(lv.nodes.every(n => Number.isInteger(n.c) && Number.isInteger(n.r))).toBe(true);
      });
      it('sol covers every edge and |sol| === k', () => {
        expect(isCleared(lv, lv.sol)).toBe(true);
        expect(coveredEdges(lv, lv.sol).size).toBe(lv.edges.length);
        expect(lv.sol.length).toBe(lv.k);
      });
      it('has a unique optimal cover', () => {
        const r = solve(lv);
        expect(r.count).toBe(1);
        expect(r.k).toBe(lv.k);
        expect([...r.sol].sort()).toEqual([...lv.sol].sort());
      });
    });
  });
});

describe('mockLevelSource', () => {
  const reqs: LevelRequest[] = [
    { mode: 'campaign', levelNo: 1 },
    { mode: 'campaign', levelNo: 57 },
    { mode: 'survival', runSeed: 'abc', step: 3 },
    { mode: 'match', matchId: 'm-1' },
  ];

  it('returns the same level for the same request', async () => {
    for (const req of reqs) {
      const a = await mockLevelSource.getLevel(req);
      const b = await mockLevelSource.getLevel(req);
      expect(a.ok && b.ok).toBe(true);
      expect(a).toEqual(b);
    }
  });

  it('serves every campaign level from the fixed maps', async () => {
    for (let n = 1; n <= CAMPAIGN_LEVELS; n++) {
      const r = await mockLevelSource.getLevel({ mode: 'campaign', levelNo: n });
      expect(r.ok && BASE_MAPS.includes(r.data)).toBe(true);
    }
  });

  it('rotates through more than one map across survival steps', async () => {
    const seen = new Set<unknown>();
    for (let s = 0; s < 8; s++) {
      const r = await mockLevelSource.getLevel({ mode: 'survival', runSeed: 'run-1', step: s });
      if (r.ok) seen.add(r.data);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('rejects out-of-range or malformed requests', async () => {
    const bad: LevelRequest[] = [
      { mode: 'campaign', levelNo: 0 },
      { mode: 'campaign', levelNo: CAMPAIGN_LEVELS + 1 },
      { mode: 'campaign', levelNo: 1.5 },
      { mode: 'survival', runSeed: 'x', step: -1 },
      { mode: 'match', matchId: '' },
    ];
    for (const req of bad) expect((await mockLevelSource.getLevel(req)).ok).toBe(false);
  });
});
