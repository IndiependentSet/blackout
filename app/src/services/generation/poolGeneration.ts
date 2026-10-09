/* One pool slot, generated and checked. Runs inside the pool worker; kept apart
   from it so it can be tested on the main thread. */
import { generateSlot, solve, type LevelCurve, type PoolSlot } from '../../domain/generation';
import type { Level } from '../../domain/types';

export interface SlotRequest { curve: LevelCurve; slot: PoolSlot }

export interface SlotResult {
  slot: number;
  tier: number;
  level: Level;
  /** the retry that produced the level; null when the curve's fallback did */
  salt: number | null;
  /** the solver found exactly one optimal cover, of the size the level states */
  unique: boolean;
  /** generation wall time on this machine */
  ms: number;
}

export function generateSlotTimed({ curve, slot }: SlotRequest, now: () => number = () => performance.now()): SlotResult {
  const t0 = now();
  const { level, salt } = generateSlot(curve, slot);
  /* checked again here, not trusted from the generator: this is the only place a non-unique level can be stopped */
  const r = solve(level);
  return { ...slot, level, salt, unique: r.count === 1 && r.k === level.k, ms: Math.round(now() - t0) };
}
