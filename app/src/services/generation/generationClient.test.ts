import { describe, expect, it, vi } from 'vitest';
import { generate, type GenerateRequest } from '../../domain/generation';
import { generateAsync, type GenerationReply, type WorkerLike } from './generationClient';

const REQ: GenerateRequest = { seed: 7, size: 8, diff: 1, options: { clock: false, attempts: 20 } };

/** A worker stand-in that answers with whatever `reply` makes of the request, on the next tick. */
function fakeWorker(reply: (req: GenerateRequest) => GenerationReply | 'crash' | 'never') {
  const w: WorkerLike & { terminated: boolean } = {
    onmessage: null, onerror: null, terminated: false,
    terminate: vi.fn(() => { w.terminated = true; }),
    postMessage(req) {
      queueMicrotask(() => {
        const r = reply(req);
        if (r === 'never' || w.terminated) return;
        if (r === 'crash') w.onerror?.({ message: 'boom' } as ErrorEvent);
        else w.onmessage?.({ data: r } as MessageEvent<GenerationReply>);
      });
    },
  };
  return w;
}

describe('generateAsync', () => {
  it('answers with the generator\'s result and stops the worker', async () => {
    const w = fakeWorker(req => ({ ok: true, result: generate(req) }));
    const r = await generateAsync(REQ, { spawn: () => w });
    if (!r.ok) throw new Error(r.error);
    expect(r.data.level).toEqual(generate(REQ).level);     // report.ms is wall time, so not compared
    expect(w.terminate).toHaveBeenCalledOnce();
  });

  it('passes on a failure from inside the worker', async () => {
    const r = await generateAsync(REQ, { spawn: () => fakeWorker(() => ({ ok: false, error: 'Error: search blew up' })) });
    expect(r).toEqual({ ok: false, error: 'Error: search blew up' });
  });

  it('turns a crashed worker into a failure', async () => {
    const r = await generateAsync(REQ, { spawn: () => fakeWorker(() => 'crash') });
    expect(r).toEqual({ ok: false, error: 'boom' });
  });

  it('stops the worker when the request is abandoned', async () => {
    const ctrl = new AbortController();
    const w = fakeWorker(() => 'never');
    const pending = generateAsync(REQ, { signal: ctrl.signal, spawn: () => w });
    ctrl.abort();
    expect(await pending).toEqual({ ok: false, error: 'aborted' });
    expect(w.terminate).toHaveBeenCalledOnce();
  });

  it('never starts a worker for a request abandoned already', async () => {
    const ctrl = new AbortController(); ctrl.abort();
    const spawn = vi.fn(() => fakeWorker(() => 'never'));
    expect(await generateAsync(REQ, { signal: ctrl.signal, spawn })).toEqual({ ok: false, error: 'aborted' });
    expect(spawn).not.toHaveBeenCalled();
  });
});
