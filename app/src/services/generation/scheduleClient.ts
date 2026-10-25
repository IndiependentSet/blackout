/* A day's levels for a schedule, generated in a worker: the admin config
   page's preview of what players would get. */
import type { GenerationSchedule } from '../../domain/generation';
import type { Level } from '../../domain/types';
import { fail, ok, type Result } from '../result';
import type { PreviewRequest, SitePreview } from './schedulePreview';
import { workerCall, type WorkerLike } from './workerCall';
import scheduleWorkerUrl from './schedule.worker.ts?worker&url';

export type { SitePreview } from './schedulePreview';
export type PreviewWorker = WorkerLike<PreviewRequest, SitePreview[]>;

/** The built worker's address: the game also hands it to the service worker, so a week can be made offline. */
export { scheduleWorkerUrl };

const spawnWorker = (): PreviewWorker => new Worker(scheduleWorkerUrl, { type: 'module' });

export function previewDayAsync(schedule: GenerationSchedule, daySeed: number,
  { signal, spawn = spawnWorker }: { signal?: AbortSignal; spawn?: () => PreviewWorker } = {}): Promise<Result<SitePreview[]>> {
  return workerCall({ schedule, daySeed }, { signal, spawn });
}

/** One site of a day, generated in a worker: a 40-junction site can take seconds, which on the main thread
    is a frozen page. */
export async function siteLevelAsync(schedule: GenerationSchedule, daySeed: number, idx: number,
  opts: { signal?: AbortSignal; spawn?: () => PreviewWorker } = {}): Promise<Result<Level>> {
  const r = await workerCall({ schedule, daySeed, only: idx }, { signal: opts.signal, spawn: opts.spawn ?? spawnWorker });
  if (!r.ok) return r;
  return r.data[0] ? ok(r.data[0].level) : fail(`no site ${idx} in the schedule`);
}
