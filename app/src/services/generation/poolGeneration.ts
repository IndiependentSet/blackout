/* One pool slot, generated and checked. Runs inside the pool worker; kept apart
   from it so it can be tested on the main thread. */
import { generateSlot, solve, type LevelCurve, type PoolSlot } from '../../domain/generation';
import type { Level } from '../../domain/types';

/** `avoid`: the pool keys (poolKey) of the levels already built, so this slot comes out as a new sky */
export interface SlotRequest { curve: LevelCurve; slot: PoolSlot; avoid?: string[] }

export interface SlotResult {
  slot: number;
  tier: number;
  level: Level;
  /** the retry that produced the level; null when the curve's fallback did */
  salt: number | null;
  /** the solver found exactly one optimal cover, of the size the level states */
  unique: boolean;
  /** the level's pool key (poolKey): two levels with the same key are the same sky */
  key: string;
  /** the same sky as a level built before it: nothing new could be found for this slot */
  duplicate: boolean;
  /** generation wall time on this machine */
  ms: number;
}

export function generateSlotTimed({ curve, slot, avoid = [] }: SlotRequest, now: () => number = () => performance.now()): SlotResult {
  const t0 = now();
  const { level, salt, key, duplicate } = generateSlot(curve, slot, new Set(avoid));
  /* checked again here, not trusted from the generator: this is the only place a non-unique level can be stopped */
  const r = solve(level);
  return { ...slot, level, salt, key, duplicate, unique: r.count === 1 && r.k === level.k, ms: Math.round(now() - t0) };
}
