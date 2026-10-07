/* Level generation on demand, off the main thread. The domain's generate() is
   synchronous and can take seconds; this runs it in a worker and answers with
   a Result, like every other service. */
import type { GenerateRequest, GenerateResult } from '../../domain/generation';
import { fail, ok, type Result } from '../result';

export type GenerationReply = { ok: true; result: GenerateResult } | { ok: false; error: string };

/** The part of a Worker the client uses (so tests can stand one in). */
export interface WorkerLike {
  postMessage(message: GenerateRequest): void;
  terminate(): void;
  onmessage: ((e: MessageEvent<GenerationReply>) => void) | null;
  onerror: ((e: ErrorEvent) => void) | null;
}

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
  return new Promise(resolve => {
    if (signal?.aborted) { resolve(fail('aborted')); return; }
    const worker = spawn();
    const settle = (r: Result<GenerateResult>) => {
      worker.terminate();
      signal?.removeEventListener('abort', onAbort);
      resolve(r);
    };
    const onAbort = () => settle(fail('aborted'));
    signal?.addEventListener('abort', onAbort, { once: true });
    worker.onmessage = e => settle(e.data.ok ? ok(e.data.result) : fail(e.data.error));
    worker.onerror = e => settle(fail(e.message || 'generation worker failed'));
    worker.postMessage(req);
  });
}
