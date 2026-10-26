import { describe, expect, it } from 'vitest';
import { LOUPE_OFFSET, LOUPE_PX, isTight, loupePlacement, loupeViewBox, pickStar, pxPerUnit, reachOf } from './loupe';

const stars = [{ i: 0, x: 0, y: 0 }, { i: 1, x: 100, y: 0 }, { i: 2, x: 0, y: 100 }];

describe('pickStar', () => {
  it('picks the nearest star within reach', () => {
    expect(pickStar(stars, { x: 10, y: 5 }, 50)).toBe(0);
    expect(pickStar(stars, { x: 70, y: 10 }, 50)).toBe(1);
    expect(pickStar(stars, { x: 5, y: 60 }, 50)).toBe(2);
  });
  it('picks nothing out of reach', () => {
    expect(pickStar(stars, { x: 100, y: 100 }, 50)).toBeNull();
    expect(pickStar([], { x: 0, y: 0 }, 50)).toBeNull();
  });
  it('reaches about as far as the next star', () => {
    expect(reachOf(45)).toBe(90);
  });
});

describe('pxPerUnit and isTight', () => {
  it('fits the viewBox into the box by its tighter side', () => {
    expect(pxPerUnit('0 0 1000 500', { w: 500, h: 500 })).toBeCloseTo(0.5);
    expect(pxPerUnit('-10 -10 100 400', { w: 500, h: 200 })).toBeCloseTo(0.5);
  });
  it('calls a target tight below 44px across', () => {
    expect(isTight(45, 0.4)).toBe(true);    // 36px
    expect(isTight(45, 0.5)).toBe(false);   // 45px
  });
});

describe('loupePlacement', () => {
  const board = { w: 360, h: 400 };
  it('centres the eyepiece above the finger', () => {
    expect(loupePlacement({ x: 180, y: 300 }, board)).toEqual({ x: 180 - LOUPE_PX / 2, y: 300 - LOUPE_OFFSET - LOUPE_PX / 2 });
  });
  it('goes below the finger near the top', () => {
    const p = loupePlacement({ x: 180, y: 40 }, board);
    expect(p.y).toBe(40 + LOUPE_OFFSET - LOUPE_PX / 2);
  });
  it('stays inside the board at the edges', () => {
    expect(loupePlacement({ x: 5, y: 300 }, board).x).toBe(0);
    expect(loupePlacement({ x: 355, y: 300 }, board).x).toBe(360 - LOUPE_PX);
    expect(loupePlacement({ x: 180, y: 390 }, { w: 360, h: 140 }).y).toBe(140 - LOUPE_PX);
  });
});

describe('loupeViewBox', () => {
  it('is a square centred on the point, magnified', () => {
    const [x, y, w, h] = loupeViewBox({ x: 100, y: 50 }, 0.5, 128, 2).split(' ').map(Number);
    expect(w).toBeCloseTo(128);
    expect(h).toBeCloseTo(128);
    expect(x + w / 2).toBeCloseTo(100);
    expect(y + h / 2).toBeCloseTo(50);
  });
});
