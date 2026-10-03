import { describe, expect, it } from 'vitest';
import { coveredEdges, isCleared } from './cover';

const path = { edges: [[0, 1], [1, 2], [2, 3]] as [number, number][] };

describe('cover', () => {
  it('covers edges touching a placed node', () => {
    expect([...coveredEdges(path, [1])]).toEqual([0, 1]);
  });
  it('is cleared only when every edge is covered', () => {
    expect(isCleared(path, [1])).toBe(false);
    expect(isCleared(path, [1, 2])).toBe(true);
    expect(isCleared(path, [])).toBe(false);
  });
});
