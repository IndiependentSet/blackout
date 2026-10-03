import { HOUSE } from '../../domain/house';
import type { Point } from '../../domain/types';

export interface Cable {
  /** SVG path data for the sagging path between two pads */
  d: string;
  /** where the smashable on it sits */
  mx: number;
  my: number;
}

/** A path between two pads: a quadratic that sags a little under its own weight. */
export function cable(A: Point, B: Point): Cable {
  const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
  const sag = Math.abs(B.x - A.x) * HOUSE.SAG_K + HOUSE.SAG_C;
  return { d: `M ${A.x} ${A.y} Q ${mx} ${my + sag} ${B.x} ${B.y}`, mx, my: my + sag / 2 };
}
