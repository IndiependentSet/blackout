import type { Cell } from './types';

export type Direction = 'ArrowRight' | 'ArrowLeft' | 'ArrowUp' | 'ArrowDown';

const DIRS: Record<Direction, [number, number]> = {
  ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
};

export const isDirection = (k: string): k is Direction => k in DIRS;

/** The node an arrow key moves keyboard focus to: nearest ahead, penalising drift off-axis. */
export function nearestInDirection(nodes: Cell[], focus: number, key: Direction): number {
  const [dx, dy] = DIRS[key];
  const cur = nodes[focus] || nodes[0];
  let best = -1, bestScore = Infinity;
  nodes.forEach((n, i) => {
    if (i === focus) return;
    const vx = n.c - cur.c, vy = n.r - cur.r;
    const along = vx * dx + vy * dy, off = Math.abs(vx * dy - vy * dx);
    if (along <= 0) return;
    const s = along + off * 2.5;
    if (s < bestScore) { bestScore = s; best = i; }
  });
  return best;
}
