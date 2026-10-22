export const SIDES = 6;
export const NR = 22;
/** How far the nearest ring reaches in a phone column; a bigger stage passes its own (`reachFor`). */
export const REACH = 760;

/** A reach that carries the nearest rings past the corners of a w×h stage, never less than the column's. */
export const reachFor = (w: number, h: number): number => Math.max(REACH, 0.82 * Math.hypot(w, h));

export interface Ring { p: number; r: number; pts: [number, number][] }

/** The warp tube: NR hexagonal rings that grow from the vanishing point (cx, cy) as they rush at the viewer. */
export function tubeGeometry(T: number, travel: number, cx: number, cy: number, reach = REACH): Ring[] {
  const rings = Array.from({ length: NR }, (_, i): Ring => {
    const p = ((i / NR) + travel) % 1;
    const r = 4 + Math.pow(p, 2.6) * reach;
    const ox = 195 + (1 - p) * (cx - 195);
    const oy = 422 + (1 - p) * (cy - 422);
    const rot = T * 0.5 + (1 - p) * 1.4;
    const pts = Array.from({ length: SIDES }, (_, j): [number, number] => {
      const a = rot + j * Math.PI * 2 / SIDES;
      return [ox + Math.cos(a) * r, oy + Math.sin(a) * r];
    });
    return { p, r, pts };
  });
  return rings.sort((a, b) => a.p - b.p);
}
