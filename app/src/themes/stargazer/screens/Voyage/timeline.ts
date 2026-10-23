/* When things happen in the voyage flight, in seconds. CUES are the authored starts of each beat. */

export const CUES = { Charted: 0, Liftoff: 1.8, Cruise: 3.1, Approach: 5.3, Arrival: 6.7 } as const;
export const TOTAL = 8.9;
/** The real Voyage screen has already played the first beat: the next world is unlocked, the finger is about to tap. */
export const START_AT = 1.2;

/** The clock after `dt` more seconds; it stops at the end. */
export const advance = (T: number, dt: number): number => Math.min(TOTAL, T + dt);

/** A tap between liftoff and the approach jumps to the arrival; anywhere else it does nothing. */
export const skip = (T: number): number => (T >= CUES.Liftoff && T < CUES.Approach ? CUES.Arrival : T);

export const isOver = (T: number): boolean => T >= TOTAL;
