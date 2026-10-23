import { describe, expect, it } from 'vitest';
import { BOARD_ROWS, mineOf, placeText, toBoard, versusText, windowOf, withGaps, type BoardRowData } from './ranking';

const row = (place: number, id: string, over: Partial<BoardRowData> = {}): BoardRowData => ({
  place, total: 50, user_id: id, username: id, avatar: null, value: 100 - place, extra: 2, is_me: false, trend: null, won_vs: null, lost_vs: null, ...over,
});
const rows = (n: number) => Array.from({ length: n }, (_, i) => row(i + 1, 'p' + (i + 1)));

describe('toBoard', () => {
  it('keeps the order and reads the total off the first row', () => {
    const b = toBoard([row(1, 'a'), row(2, 'b')]);
    expect(b.entries.map(e => e.userId)).toEqual(['a', 'b']);
    expect(b.entries[0]).toMatchObject({ place: 1, userId: 'a', value: 99, extra: 2, isMe: false });
    expect(b.total).toBe(50);
  });
  it('is an empty board with nothing on it', () => {
    expect(toBoard([])).toEqual({ entries: [], total: 0 });
  });
});

describe('mineOf', () => {
  it('finds the caller, or says they are not on the board', () => {
    expect(mineOf(toBoard([row(1, 'a'), row(2, 'b', { is_me: true })]))?.userId).toBe('b');
    expect(mineOf(toBoard([row(1, 'a')]))).toBeNull();
  });
});

describe('windowOf', () => {
  it('lists everything when the board is short, with nothing hidden', () => {
    const b = toBoard(rows(3).map(r => ({ ...r, total: 3 })));
    expect(windowOf(b)).toMatchObject({ top: b.entries, hidden: 0 });
  });
  it('hides nothing when the player is inside the first rows', () => {
    const b = toBoard([...rows(BOARD_ROWS - 1), row(BOARD_ROWS, 'me', { is_me: true })]);
    expect(windowOf(b).hidden).toBe(0);
    expect(windowOf(b).top).toHaveLength(BOARD_ROWS);
  });
  it('cuts at the limit and counts the players between the list and a pinned row', () => {
    const b = toBoard([...rows(BOARD_ROWS), row(47, 'me', { is_me: true })]);
    const w = windowOf(b);
    expect(w.top).toHaveLength(BOARD_ROWS);
    expect(w.top.some(e => e.isMe)).toBe(false);
    expect(w.hidden).toBe(50 - BOARD_ROWS - 1);
  });
  it('hides nothing when the pinned row follows the list directly', () => {
    const b = toBoard([...rows(BOARD_ROWS), row(BOARD_ROWS + 1, 'me', { is_me: true })].map(r => ({ ...r, total: BOARD_ROWS + 1 })));
    expect(windowOf(b).hidden).toBe(0);
  });
  it('lists nothing but the pinned row for a place-only read', () => {
    const b = toBoard([row(47, 'me', { is_me: true })]);
    expect(windowOf(b, 0)).toEqual({ top: [], hidden: 49 });
  });
});

describe('placeText', () => {
  it('names a place and the size of the board', () => {
    expect(placeText({ place: 47 }, 312)).toBe('#47 of 312');
  });
});

describe('toBoard, the duel columns', () => {
  it('carries the trend and the record against a rival, and nothing when the server sent none', () => {
    const b = toBoard([row(1, 'a', { trend: 24, won_vs: 4, lost_vs: 2 }), row(2, 'b'), row(3, 'c', { won_vs: 0, lost_vs: 0 })]);
    expect(b.entries[0]).toMatchObject({ trend: 24, versus: { won: 4, lost: 2 } });
    expect(b.entries[1]).toMatchObject({ trend: null, versus: null });
    expect(b.entries[2].versus).toEqual({ won: 0, lost: 0 });
  });
});

describe('versusText', () => {
  it('says who leads, or that it is level, and nothing before a first duel', () => {
    expect(versusText({ won: 4, lost: 2 })).toBe('You lead 4–2');
    expect(versusText({ won: 1, lost: 3 })).toBe('They lead 3–1');
    expect(versusText({ won: 2, lost: 2 })).toBe('Level 2–2');
    expect(versusText({ won: 0, lost: 0 })).toBeNull();
    expect(versusText(null)).toBeNull();
  });
});

describe('withGaps', () => {
  it('marks where places jump, and only there', () => {
    const b = toBoard([row(1, 'a'), row(2, 'b'), row(5, 'c'), row(6, 'd'), row(9, 'e')]);
    expect(withGaps(b.entries).map(x => (x === 'gap' ? '…' : x.place))).toEqual([1, 2, '…', 5, 6, '…', 9]);
  });
  it('treats rows tied on a place as no gap', () => {
    const b = toBoard([row(1, 'a'), row(1, 'b'), row(3, 'c')]);
    expect(withGaps(b.entries)).toHaveLength(3);
  });
});
