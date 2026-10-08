/* A day's levels for a schedule, generated in a worker: the admin config
   page's preview of what players would get. */
import type { GenerationSchedule } from '../../domain/generation';
import { type Result } from '../result';
import type { PreviewRequest, SitePreview } from './schedulePreview';
import { workerCall, type WorkerLike } from './workerCall';

export type { SitePreview } from './schedulePreview';
export type PreviewWorker = WorkerLike<PreviewRequest, SitePreview[]>;

const spawnWorker = (): PreviewWorker =>
  new Worker(new URL('./schedule.worker.ts', import.meta.url), { type: 'module' });

export function previewDayAsync(schedule: GenerationSchedule, daySeed: number,
  { signal, spawn = spawnWorker }: { signal?: AbortSignal; spawn?: () => PreviewWorker } = {}): Promise<Result<SitePreview[]>> {
  return workerCall({ schedule, daySeed }, { signal, spawn });
}
