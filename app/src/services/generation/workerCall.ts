/* One request, one fresh worker: the worker is terminated as soon as it
   answers or the request is abandoned, so a stale run never keeps the CPU.
   Shared by every generation client. */
import { fail, ok, type Result } from '../result';

/** What a generation worker posts back. */
export type WorkerReply<T> = { ok: true; result: T } | { ok: false; error: string };

/** The part of a Worker the clients use (so tests can stand one in). */
export interface WorkerLike<Req = unknown, Res = unknown> {
  postMessage(message: Req): void;
  terminate(): void;
  onmessage: ((e: MessageEvent<WorkerReply<Res>>) => void) | null;
  onerror: ((e: ErrorEvent) => void) | null;
}

export interface WorkerCallOptions<Req, Res> {
  /** aborting stops the worker at once and answers `fail('aborted')` */
  signal?: AbortSignal;
  spawn: () => WorkerLike<Req, Res>;
}

export function workerCall<Req, Res>(req: Req, { signal, spawn }: WorkerCallOptions<Req, Res>): Promise<Result<Res>> {
  return new Promise(resolve => {
    if (signal?.aborted) { resolve(fail('aborted')); return; }
    const worker = spawn();
    const settle = (r: Result<Res>) => {
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
