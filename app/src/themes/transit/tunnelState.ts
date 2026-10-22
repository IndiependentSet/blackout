import { clamp, MOTION, tween } from './motion';
import { CUES } from './timeline';

/** What the tunnel is doing at time T, shared by its backdrop (whole screen) and its picture (the phone column). */
export function tunnelAt(T: number) {
  const { Wormhole: wh, CatPlanet: cp } = CUES;
  const op = tween(T, 0, 1, wh - 0.15, wh + 0.4, MOTION.enter);
  const k = clamp((T - wh) / (cp - wh), 0, 1);
  return { on: op > 0 && T <= cp + 0.5, op, k, travel: (T - wh + 0.5) * (0.3 + k * 1.1), cx: 195 + Math.sin(T * 1.7) * 26, cy: 400 + Math.cos(T * 1.3) * 30 };
}
