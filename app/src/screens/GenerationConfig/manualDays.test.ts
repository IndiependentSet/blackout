import { describe, expect, it } from 'vitest';
import { newDraft, openSlot, pinnedAt, pinnedSites } from './manualDays';

const fig = { nodes: [{ c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }], edges: [[0, 1], [1, 2]] as [number, number][] };
const list = [{ day: 9, idx: 4, figure: fig, note: '' }, { day: 9, idx: 1, figure: fig, note: '' }, { day: 10, idx: 0, figure: fig, note: '' }];

describe('manual days', () => {
  it('finds what is pinned where', () => {
    expect(pinnedAt(list, 9, 4)?.figure).toBe(fig);
    expect(pinnedAt(list, 9, 2)).toBeUndefined();
    expect(pinnedSites(list, 9)).toEqual([1, 4]);
  });
  it('opens a pinned site with its drawing, and an empty one blank', () => {
    expect(openSlot(list, 10, 0)).toEqual({ day: 10, idx: 0, figure: fig, dirty: false });
    expect(openSlot(list, 10, 1)).toEqual(newDraft(10, 1));
  });
});
