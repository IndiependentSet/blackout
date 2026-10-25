/* The small animation toolkit the voyage flight and the telescope's slew run on: every frame is a pure function of the time T. */

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export type Ease = (t: number) => number;

const C1 = 1.70158;
const C3 = C1 + 1;

export const Easing = {
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInCubic: (t) => t * t * t,
  easeInQuad: (t) => t * t,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeOutBack: (t) => 1 + C3 * Math.pow(t - 1, 3) + C1 * Math.pow(t - 1, 2),
} satisfies Record<string, Ease>;

/** The named moves the scenes share. */
export const MOTION = { enter: Easing.easeOutCubic, glide: Easing.easeInOutCubic, pop: Easing.easeOutBack };

/** `from` at time `start`, `to` at `end`, eased in between and held either side. */
export function animate(T: number, from: number, to: number, start: number, end: number, ease: Ease = MOTION.glide): number {
  return from + (to - from) * ease(clamp((T - start) / (end - start), 0, 1));
}

/** A colour at `a` opacity, mixed by the browser so the transit keeps using the theme's own variables. */
export const alpha = (color: string, a: number): string => `color-mix(in srgb, ${color} ${Math.round(clamp(a, 0, 1) * 100)}%, transparent)`;

/** Colour `a` blended towards `b` by `t`. */
export const mix = (a: string, b: string, t: number): string => `color-mix(in srgb, ${b} ${Math.round(clamp(t, 0, 1) * 100)}%, ${a})`;
