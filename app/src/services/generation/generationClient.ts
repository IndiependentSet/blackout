/* Level generation on demand, off the main thread. The domain's generate() is
   synchronous and can take seconds; this runs it in a worker and answers with
   a Result, like every other service. */
import type { GenerateRequest, GenerateResult } from '../../domain/generation';
import { type Result } from '../result';
import { workerCall, type WorkerLike as AnyWorker, type WorkerReply } from './workerCall';

export type GenerationReply = WorkerReply<GenerateResult>;
export type WorkerLike = AnyWorker<GenerateRequest, GenerateResult>;

const spawnWorker = (): WorkerLike =>
  new Worker(new URL('./generation.worker.ts', import.meta.url), { type: 'module' });

export interface GenerateAsyncOptions {
  /** aborting stops the worker at once and answers `fail('aborted')` */
  signal?: AbortSignal;
  spawn?: () => WorkerLike;
}

/** Generate one level in a fresh worker, which is terminated as soon as it
    answers or the request is abandoned, so a stale run never keeps the CPU. */
export function generateAsync(req: GenerateRequest, { signal, spawn = spawnWorker }: GenerateAsyncOptions = {}): Promise<Result<GenerateResult>> {
  return workerCall(req, { signal, spawn });
}
