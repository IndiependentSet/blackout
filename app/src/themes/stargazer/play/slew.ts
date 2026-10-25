/* The telescope's slew between two skies: the view closes down to an eyepiece, the telescope swings across the
   night to the next patch, the new sky arrives out of focus, is racked sharp, and the eyepiece opens again.
   Every frame is a pure function of the clock T (seconds at the full pace); nothing here touches the puzzle. */
import { rngFromSeed } from '../../../domain/rng';
import { animate, clamp, Easing, MOTION } from '../kit/motion';

/** Meteor Rush's clock is running, so its slew plays at twice the speed. */
export type Pace = 'full' | 'brisk';
export const PACE: Record<Pace, number> = { full: 1, brisk: 2 };

/** When each beat starts, in seconds. */
export const CUES = { close: 0, slew: 0.3, focus: 1.05, open: 1.45 } as const;
export const TOTAL = 1.85;

/** How far the eyepiece closes: 1 is a circle as wide as the board's short side. */
const RING_OPEN = 1;
const RING_SHUT = 0.86;
/** The new sky's blur, in px, while it is out of focus. */
const BLUR = 3.2;
/** The new sky starts a touch magnified and settles as it comes into focus. */
const ZOOM = 1.05;

export interface SlewFrame {
  /** 0 the eyepiece is gone, 1 it is fully closed down: the dark around it, the reticle and the telescope */
  shut: number;
  /** the eyepiece's size against the board's short side */
  ring: number;
  /** 0 the old sky is centred, 1 the new one is */
  travel: number;
  /** how fast the view is moving, 0..1: the field stars streak with it */
  speed: number;
  /** the old sky's opacity */
  outgoing: number;
  /** the new sky: opacity, blur in px, scale */
  incoming: number;
  blur: number;
  zoom: number;
  /** the telescope's tube: 0 aimed at the old sky, 1 at the new, with a little settle past it */
  turn: number;
}

const eio = Easing.easeInOutCubic;
/** easeInOutCubic's slope, normalised so its peak (at the middle) is 1 */
const eioSpeed = (t: number) => (t <= 0 || t >= 1 ? 0 : (t < 0.5 ? 12 * t * t : 12 * (1 - t) * (1 - t)) / 3);

/** A mount coming to rest: a small swing past the target that dies away. */
const settle = (T: number) => (T <= CUES.focus ? 0 : 0.03 * Math.sin((T - CUES.focus) * 24) * Math.exp(-(T - CUES.focus) * 9));

/** Focus being racked by hand: past sharp, back a little, then sharp. */
function focusBlur(T: number): number {
  if (T < CUES.focus) return BLUR;
  const u = clamp((T - CUES.focus) / (CUES.open - CUES.focus), 0, 1);
  if (u < 0.55) return BLUR * (1 - Easing.easeOutCubic(u / 0.55));
  if (u < 0.75) return 0.9 * Easing.easeOutCubic((u - 0.55) / 0.2);
  return 0.9 * (1 - Easing.easeOutCubic((u - 0.75) / 0.25));
}

export function slewFrame(T: number): SlewFrame {
  const t = clamp(T, 0, TOTAL);
  const opening = t >= CUES.open;
  const shut = opening ? animate(t, 1, 0, CUES.open, TOTAL, MOTION.glide) : animate(t, 0, 1, CUES.close, CUES.slew, MOTION.enter);
  const ring = opening ? animate(t, RING_SHUT, RING_OPEN, CUES.open, TOTAL, MOTION.glide) : animate(t, RING_OPEN, RING_SHUT, CUES.close, CUES.slew, MOTION.enter);
  const u = clamp((t - CUES.slew) / (CUES.focus - CUES.slew), 0, 1);
  const travel = eio(u) + settle(t);
  return {
    shut, ring, travel,
    speed: eioSpeed(u),
    outgoing: animate(t, 1, 0, CUES.slew + 0.5, CUES.focus),
    incoming: animate(t, 0.4, 1, CUES.slew, CUES.slew + 0.45),
    blur: focusBlur(t),
    zoom: animate(t, ZOOM, 1, CUES.focus, CUES.open, MOTION.enter),
    turn: travel,
  };
}

/** The clock after `dt` more real seconds at `pace`; it stops at the end. */
export const advance = (T: number, dt: number, pace: Pace): number => Math.min(TOTAL, T + dt * PACE[pace]);
export const isOver = (T: number): boolean => T >= TOTAL;

/** The beats the slew's sound follows, in real seconds from the start at `pace`. */
export const slewBeats = (pace: Pace): { move: number; focus: number; sharp: number } =>
  ({ move: CUES.slew / PACE[pace], focus: CUES.focus / PACE[pace], sharp: CUES.open / PACE[pace] });

export interface Heading {
  /** the way the view travels, as a unit vector on screen (y down): the new sky comes in from there */
  dx: number;
  dy: number;
  /** the same, in degrees */
  angle: number;
}

/** Which way the telescope swings to reach sky `slot`: onwards to the right, back to the left, tilted a little up or
    down by the slot so consecutive slews don't all look alike. */
export function slewHeading(slot: number, back: boolean): Heading {
  const tilt = ((((slot * 47) % 41) + 41) % 41) - 20;   // -20..20, the same every time for a slot
  const angle = (back ? 180 - tilt : tilt);
  const rad = (angle * Math.PI) / 180;
  return { dx: Math.cos(rad), dy: Math.sin(rad), angle };
}

/** How far the view travels, in px, for the old sky to leave a w×h board completely before the new one arrives. */
export const slewDistance = (h: Heading, w: number, hgt: number): number => 1.1 * (Math.abs(h.dx) * w + Math.abs(h.dy) * hgt);

export interface FieldStar {
  /** along the path, as a share of the slew's distance */
  u: number;
  /** across it, as a share of the board's short side */
  v: number;
  r: number;
  a: number;
}

/** The faint stars between the two skies that streak past while the telescope moves; seeded by the slot. */
export function fieldStars(slot: number, count = 34): FieldStar[] {
  const rng = rngFromSeed(0x5e1e57 ^ Math.imul(slot + 1, 0x9e3779b1));
  return Array.from({ length: count }, () => ({
    u: 0.08 + rng() * 0.84,
    v: (rng() - 0.5) * 1.4,
    r: 0.6 + rng() * 1.1,
    a: 0.25 + rng() * 0.6,
  }));
}
