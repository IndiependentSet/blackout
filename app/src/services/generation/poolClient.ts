/* A pool slot generated in a worker: the admin pool page builds a pool one
   slot at a time so it can show progress and stop at once. */
import type { LevelCurve, PoolSlot } from '../../domain/generation';
import type { Result } from '../result';
import type { SlotRequest, SlotResult } from './poolGeneration';
import { workerCall, type WorkerLike } from './workerCall';

export type { SlotResult } from './poolGeneration';
export type PoolWorker = WorkerLike<SlotRequest, SlotResult>;

const spawnWorker = (): PoolWorker =>
  new Worker(new URL('./pool.worker.ts', import.meta.url), { type: 'module' });

export function generateSlotAsync(curve: LevelCurve, slot: PoolSlot,
  { signal, spawn = spawnWorker }: { signal?: AbortSignal; spawn?: () => PoolWorker } = {}): Promise<Result<SlotResult>> {
  return workerCall({ curve, slot }, { signal, spawn });
}
