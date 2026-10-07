/** Lattice geometry shared by the generator and the graph statistics. Pure. */
import type { Cell } from './types';

export function distPtSeg(p: Cell, a: Cell, b: Cell) {
  const vx = b.c - a.c, vy = b.r - a.r;
  const wx = p.c - a.c, wy = p.r - a.r;
  const L = vx * vx + vy * vy;
  let t = L ? (wx * vx + wy * vy) / L : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(a.c + t * vx - p.c, a.r + t * vy - p.r);
}
function ccw(a: Cell, b: Cell, c: Cell) { return (b.c - a.c) * (c.r - a.r) - (b.r - a.r) * (c.c - a.c); }
/** Do segments ab and cd properly cross? */
export function segCross(a: Cell, b: Cell, c: Cell, d: Cell) {
  const d1 = ccw(a, b, c), d2 = ccw(a, b, d), d3 = ccw(c, d, a), d4 = ccw(c, d, b);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}
