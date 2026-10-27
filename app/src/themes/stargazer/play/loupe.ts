/* The loupe: on a big sky on a touch screen, pressing and holding opens a small eyepiece above the finger with the
   sky magnified around it; lifting lights the star ringed in it. Pure: what to pick, where the eyepiece goes and what
   it shows. The pointer handling is `useLoupe`, the drawing `Loupe`. */
import type { Box, SkyStar } from './sky';

export interface Pt { x: number; y: number }

/** how long a finger is held still before the loupe opens, ms */
export const HOLD_MS = 300;
/** a finger that moves further than this while held (px) is not holding: it's a tap or a slip */
export const SLOP_PX = 10;
/** the eyepiece's diameter, px, how far its centre sits from the finger, and how much it magnifies */
export const LOUPE_PX = 128;
export const LOUPE_OFFSET = 90;
export const LOUPE_ZOOM = 2.5;
/** a tap target smaller across than this on screen (px) is hard to hit: the board offers the loupe */
export const MIN_TARGET_PX = 44;

/** px on screen per world unit for a viewBox fitted ("meet") into a box. */
export function pxPerUnit(viewBox: string, box: Box): number {
  const [, , w, h] = viewBox.split(' ').map(Number);
  return Math.min(box.w / w, box.h / h);
}

/** Whether the board's tap targets are small enough on screen to need the loupe. */
export const isTight = (hit: number, ppu: number) => 2 * hit * ppu < MIN_TARGET_PX;

/** How far from a star the loupe still picks it, world units: about as far as the next star (hit is half the
    closest pair, or less), so anywhere on the board some star is in reach. */
export const reachOf = (hit: number) => 2 * hit;

/** The star nearest a point, if one is within reach. */
export function pickStar(stars: readonly Pick<SkyStar, 'i' | 'x' | 'y'>[], at: Pt, reach: number): number | null {
  let best: number | null = null, bestD = reach;
  for (const s of stars) {
    const d = Math.hypot(s.x - at.x, s.y - at.y);
    if (d <= bestD) { bestD = d; best = s.i; }
  }
  return best;
}

/** Where the eyepiece's top left corner goes, px within the board: centred above the finger, below it when there is
    no room above, and kept inside the board. */
export function loupePlacement(finger: Pt, board: Box, size = LOUPE_PX, offset = LOUPE_OFFSET): Pt {
  const clamp = (v: number, hi: number) => Math.max(0, Math.min(Math.max(0, hi), v));
  const above = finger.y - offset - size / 2;
  const y = above >= 0 ? above : finger.y + offset - size / 2;
  return { x: clamp(finger.x - size / 2, board.w - size), y: clamp(y, board.h - size) };
}

/** What the eyepiece shows: a square of sky centred on the point under the finger, magnified `zoom` times. */
export function loupeViewBox(at: Pt, ppu: number, size = LOUPE_PX, zoom = LOUPE_ZOOM): string {
  const span = size / (ppu * zoom);
  return `${at.x - span / 2} ${at.y - span / 2} ${span} ${span}`;
}
