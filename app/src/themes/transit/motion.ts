/* The small animation toolkit the transit runs on: every frame is a pure function of the time T, so these are
   plain easings and a tween, no engine. */

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export type Ease = (t: number) => number;

const C1 = 1.70158;
const C3 = C1 + 1;

export const Easing = {
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInCubic: (t) => t * t * t,
  easeInQuad: (t) => t * t,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeOutBack: (t) => 1 + C3 * Math.pow(t - 1, 3) + C1 * Math.pow(t - 1, 2),
  easeInBack: (t) => C3 * t * t * t - C1 * t * t,
} satisfies Record<string, Ease>;

/** The named moves the scenes share. */
export const MOTION = { enter: Easing.easeOutCubic, glide: Easing.easeInOutCubic, pop: Easing.easeOutBack };

/** `from` at time `start`, `to` at `end`, eased in between and held either side. */
export function tween(T: number, from: number, to: number, start: number, end: number, ease: Ease = MOTION.glide): number {
  return from + (to - from) * ease(clamp((T - start) / (end - start), 0, 1));
}

/** Whether T is in [start, end). */
export const within = (T: number, start: number, end: number): boolean => T >= start && T < end;

/* Colours are mixed by the browser (`color-mix`), so the transit keeps using the theme's own variables
   instead of carrying hex values to interpolate by hand. */
export function mix(a: string, b: string, t: number): string {
  return `color-mix(in srgb, ${b} ${Math.round(clamp(t, 0, 1) * 100)}%, ${a})`;
}
export function mix3(a: string, b: string, c: string, t: number): string {
  return t < 0.5 ? mix(a, b, t * 2) : mix(b, c, t * 2 - 1);
}
