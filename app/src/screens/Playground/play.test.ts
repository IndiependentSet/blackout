import { describe, expect, it } from 'vitest';
import { playStatus, togglePlaced } from './play';

/* a path 0-1-2-3: par 2 */
const lv = { edges: [[0, 1], [1, 2], [2, 3]] as [number, number][], k: 2 };

describe('play', () => {
  it('hires and recalls', () => {
    expect(togglePlaced([], 1)).toEqual([1]);
    expect(togglePlaced([1, 2], 1)).toEqual([2]);
  });

  it('counts open paths until the board is cleared', () => {
    expect(playStatus(lv, [])).toMatchObject({ used: 0, open: 3, cleared: false });
    expect(playStatus(lv, [1])).toMatchObject({ open: 1, cleared: false });
    expect(playStatus(lv, [1, 2])).toMatchObject({ open: 0, cleared: true, overPar: 0 });
    expect(playStatus(lv, [0, 1, 2])).toMatchObject({ cleared: true, overPar: 1 });
  });
});
