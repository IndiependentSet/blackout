/* When things happen, and the clock that runs it. The film is a pure function of T; the clock is the only state:
   where T is, which button the player pressed (null while undecided), and how long it has waited. */

export const CUES = { Tonight: 0, Boarding: 2.4, WrongButton: 5.0, Wormhole: 6.6, CatPlanet: 9.8, Hired: 12.2 } as const;
export const TOTAL = 15.6;
/** The real Tonight screen has already played its taps; the film joins just after the seventh. */
export const START_AT = 1.9;
/** How long the finished frame waits for CLOCK IN before moving on by itself. */
export const END_IDLE = 1.2;
/** The console waits here for a button... */
export const HOLD_AT = CUES.WrongButton - 0.05;
/** ...and presses the wrong one for the player after this long. */
export const IDLE_SLIP = 2;

export type Branch = 'slip' | 'autopilot';

export interface Clock {
  T: number;
  branch: Branch | null;
  /** seconds spent waiting at HOLD_AT */
  held: number;
  /** seconds spent on the finished frame */
  rest: number;
}

export const startClock = (T: number = START_AT): Clock => ({ T, branch: null, held: 0, rest: 0 });

/** Advance by dt seconds: stop at the console until a branch is chosen, and rest at the end. */
export function tick(c: Clock, dt: number): Clock {
  if (c.branch === null && c.T >= HOLD_AT) {
    const held = c.held + dt;
    return held >= IDLE_SLIP ? { ...c, branch: 'slip', held } : { ...c, held };
  }
  const limit = c.branch === null ? HOLD_AT : TOTAL;
  const T = Math.min(limit, c.T + dt);
  return T >= TOTAL ? { ...c, T, rest: c.rest + dt } : { ...c, T };
}

/** The player pressed a console button. Only the first press counts. */
export const choose = (c: Clock, branch: Branch): Clock => (c.branch === null ? { ...c, branch } : c);

/** Skipping works once the console is up, so the taps that are still arriving from the title do not cut the film short. */
export const SKIP_FROM = CUES.Boarding + 1.0;
export const canSkip = (T: number): boolean => T >= SKIP_FROM && T < CUES.Hired;

/** Jump to the last frame (with the wrong button if none was pressed). */
export const skip = (c: Clock): Clock => (canSkip(c.T) ? { ...c, T: CUES.Hired, branch: c.branch ?? 'slip' } : c);

export const isOver = (c: Clock): boolean => c.rest >= END_IDLE;
