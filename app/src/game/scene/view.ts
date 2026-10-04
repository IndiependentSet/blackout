import type { Rect } from '../../domain/types';

/** Is a box within the frame grown by 30% each way? Anything outside isn't drawn at all. */
export function makeSeen(view: Rect) {
  return (x0: number, y0: number, x1: number, y1: number) =>
    x1 > view.x - view.w * 0.3 && x0 < view.x + view.w * 1.3 && y1 > view.y - view.h * 0.3 && y0 < view.y + view.h * 1.3;
}
export type Seen = ReturnType<typeof makeSeen>;

/** A box in world units: x0, y0, x1, y1. */
export type Bounds = readonly [number, number, number, number];
export const inView = (seen: Seen, b: Bounds) => seen(b[0], b[1], b[2], b[3]);
