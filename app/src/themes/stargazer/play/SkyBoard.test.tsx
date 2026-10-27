import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Level } from '../../../domain/types';
import { HOLD_MS } from './loupe';
import { SkyBoard } from './SkyBoard';

/* a path of three stars, 0 - 1 - 2 */
const path: Level = {
  nodes: [{ c: 2, r: 5 }, { c: 3, r: 5 }, { c: 4, r: 5 }],
  edges: [[0, 1], [1, 2]], adj: [[1], [0, 2], [1]], k: 1, sol: [1], stars: 1,
};
/* a board this small makes the stars too close to tap: the loupe is offered */
const SMALL = { w: 60, h: 60 };
const BIG = { w: 600, h: 600 };

const sky = () => document.querySelector('svg[aria-label="Sky"]') as SVGSVGElement;
const loupe = () => document.querySelector('use');
const target = (i: number) => document.querySelectorAll('circle[role=button]')[i];

/* the sky's own units ⇄ px: the viewBox fitted into the box, as the browser would; the svg sits at the page's origin */
function frame(box: { w: number; h: number }) {
  const [x, y, w, h] = sky().getAttribute('viewBox')!.split(' ').map(Number);
  const k = Math.min(box.w / w, box.h / h);
  const ox = (box.w - w * k) / 2, oy = (box.h - h * k) / 2;
  return {
    inverse: { a: 1 / k, b: 0, c: 0, d: 1 / k, e: x - ox / k, f: y - oy / k },
    client: (i: number) => {
      const t = target(i);
      return { clientX: ox + (Number(t.getAttribute('cx')) - x) * k, clientY: oy + (Number(t.getAttribute('cy')) - y) * k };
    },
  };
}

function setup(box: { w: number; h: number }) {
  const onTap = vi.fn();
  const { rerender } = render(<SkyBoard level={path} placed={[]} sweep={false} ring={null} focus={null} onTapStar={onTap} box={box} />);
  const f = frame(box);
  Object.defineProperty(sky(), 'getScreenCTM', { configurable: true, value: () => ({ inverse: () => f.inverse }) });
  /** the board measured at a new size, as when the phone turns */
  const resize = (to: { w: number; h: number }) =>
    rerender(<SkyBoard level={path} placed={[]} sweep={false} ring={null} focus={null} onTapStar={onTap} box={to} />);
  return { onTap, at: f.client, resize };
}

const touch = { pointerType: 'touch', pointerId: 1, isPrimary: true };
const hold = () => act(() => { vi.advanceTimersByTime(HOLD_MS + 10); });

describe('SkyBoard loupe', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('leaves a quick tap to the star itself', () => {
    const { onTap, at } = setup(SMALL);
    fireEvent.pointerDown(sky(), { ...touch, ...at(0) });
    fireEvent.pointerUp(sky(), { ...touch, ...at(0) });
    fireEvent.click(target(0));
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onTap).toHaveBeenCalledWith(0);
    expect(loupe()).toBeNull();
  });

  it('opens on a held finger, follows it, and lights the star under it once when lifted', () => {
    const { onTap, at } = setup(SMALL);
    fireEvent.pointerDown(sky(), { ...touch, ...at(0) });
    expect(loupe()).toBeNull();
    hold();
    expect(loupe()).not.toBeNull();
    fireEvent.pointerMove(sky(), { ...touch, ...at(2) });
    fireEvent.pointerUp(sky(), { ...touch, ...at(2) });
    fireEvent.click(target(0));   // the browser's click for the same touch
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onTap).toHaveBeenCalledWith(2);
    expect(loupe()).toBeNull();
  });

  it('lights nothing when the touch is cancelled', () => {
    const { onTap, at } = setup(SMALL);
    fireEvent.pointerDown(sky(), { ...touch, ...at(1) });
    hold();
    fireEvent.pointerCancel(sky(), touch);
    expect(loupe()).toBeNull();
    expect(onTap).not.toHaveBeenCalled();
  });

  it('closes when the board changes size under the finger, and that touch lights nothing', () => {
    const { onTap, at, resize } = setup(SMALL);
    fireEvent.pointerDown(sky(), { ...touch, ...at(1) });
    hold();
    expect(loupe()).not.toBeNull();
    resize({ w: 80, h: 50 });
    expect(loupe()).toBeNull();
    fireEvent.pointerUp(sky(), { ...touch, ...at(1) });
    expect(onTap).not.toHaveBeenCalled();
  });

  it('is a tap, not a hold, when the finger moves first', () => {
    const { at } = setup(SMALL);
    const a = at(0);
    fireEvent.pointerDown(sky(), { ...touch, ...a });
    fireEvent.pointerMove(sky(), { ...touch, clientX: a.clientX + 20, clientY: a.clientY });
    hold();
    expect(loupe()).toBeNull();
  });

  it('never opens for a mouse', () => {
    const small = setup(SMALL);
    fireEvent.pointerDown(sky(), { ...touch, pointerType: 'mouse', ...small.at(0) });
    hold();
    expect(loupe()).toBeNull();
  });

  it('never opens on a board with room to tap', () => {
    const { at } = setup(BIG);
    fireEvent.pointerDown(sky(), { ...touch, ...at(0) });
    hold();
    expect(loupe()).toBeNull();
  });
});

describe('Count on the board', () => {
  const draw = (placed: number[], counted: number[] | null) =>
    render(<SkyBoard level={path} placed={placed} sweep={false} counted={counted} ring={null} focus={null} onTapStar={() => {}} box={BIG} />);
  const marks = () => [...document.querySelectorAll('[data-counted]')];

  it('marks the counted lines inside the art the loupe shows', () => {
    draw([], [1]);
    expect(marks().map(m => m.getAttribute('data-counted'))).toEqual(['1']);
    const art = document.querySelector('g[id^="sg-art"]')!;
    expect(art.contains(marks()[0])).toBe(true);
  });
  it('marks nothing when Count is off, and never a lit line', () => {
    draw([], null);
    expect(marks()).toHaveLength(0);
    document.body.innerHTML = '';
    draw([0], [0]);
    expect(marks()).toHaveLength(0);
  });
});
