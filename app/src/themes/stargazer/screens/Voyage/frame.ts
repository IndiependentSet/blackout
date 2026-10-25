import { clamp, Easing, lerp, animate, MOTION } from '../../kit/motion';
import { CUES } from './timeline';

/* Everything on screen in the flight, worked out from the clock alone. */

export interface Frame {
  /** the Voyage screen of the finished world dropping away, 0 (there) to 1 (gone) */
  uiOut: number;
  tapRing: number;
  finger: number;
  fingerY: number;
  /** space fading in over the screen, and out again at the arrival */
  space: number;
  /** progress through the cruise and the approach */
  k: number;
  a: number;
  /** the target world: where it is, how big, whether it is on, and how open the old world's ring is */
  tx: number;
  ty: number;
  ts: number;
  heroOn: boolean;
  oldWorld: number;
  warp: number;
  travel: number;
  /** the ship */
  shipIn: number;
  dive: number;
  head: number;
  route: number;
  motif: number;
  flash: number;
  tint: number;
  arrival: number;
}

export function frameAt(T: number): Frame {
  const { Liftoff: L, Cruise: C, Approach: Ap, Arrival: Ar } = CUES;
  const k = clamp((T - C) / (Ap - C), 0, 1);
  const a = clamp((T - Ap) / (Ar - Ap), 0, 1);
  let tx = 195, ty = 330, ts: number;
  if (T < C) { const p = animate(T, 0, 1, L, L + 1.2); tx = lerp(65, 195, p); ty = lerp(799, 330, p); ts = lerp(110, 14, p); }
  else if (T < Ap) ts = 14 * Math.pow(220 / 14, Easing.easeInQuad(k));
  else { const e = Easing.easeInCubic(a); ty = lerp(330, 422, e); ts = 220 * Math.pow(16, e); }
  const warp = animate(T, 0, 1, L + 0.5, C + 0.4, Easing.easeInQuad) * (1 - animate(T, 0, 1, Ap + 0.5, Ar));
  const tapP = (T - 1.2) / 0.45;
  return {
    uiOut: animate(T, 0, 1, L, L + 0.5),
    tapRing: tapP > 0 && tapP < 1 ? tapP : -1,
    finger: animate(T, 0, 1, 0.85, 1.1, MOTION.enter) * (1 - animate(T, 0, 1, 1.35, 1.55)),
    fingerY: lerp(900, 800, animate(T, 0, 1, 0.85, 1.15, MOTION.enter)),
    space: animate(T, 0, 1, L + 0.05, L + 0.5) * (1 - animate(T, 0, 1, Ar + 0.05, Ar + 0.45)),
    k, a, tx, ty, ts,
    heroOn: T >= L && T < Ar + 0.3,
    oldWorld: animate(T, 0, 1, L, L + 1.1, Easing.easeInCubic),
    warp,
    travel: (T - L) * (0.25 + 0.7 * warp),
    shipIn: animate(T, 0, 1, L + 0.45, L + 1.1, MOTION.enter),
    dive: Easing.easeInCubic(a),
    head: animate(T, 0, 1, L + 0.8, C + 0.2, MOTION.enter) * (1 - animate(T, 0, 1, Ap + 0.3, Ap + 0.7)),
    route: animate(T, 0, 1, L + 0.7, Ap + 0.9),
    motif: animate(T, 0, 1, C - 0.4, C + 0.5) * (1 - animate(T, 0, 1, Ar - 0.05, Ar + 0.25)),
    flash: Math.max(0, 1 - Math.abs(T - (Ar - 0.05)) / 0.32),
    tint: clamp((T - C) / (Ar - C), 0, 1),
    arrival: animate(T, 0, 1, Ar - 0.05, Ar + 0.45, MOTION.enter),
  };
}
