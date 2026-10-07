/* Runs a variety sweep off the main thread, reporting as it goes. Stopping
   is done by terminating the worker. */
import type { PlaygroundParams } from './params';
import { summarize, sweep } from './variety';

const PROGRESS_MS = 250;

self.onmessage = (e: MessageEvent<{ params: PlaygroundParams; samples: number }>) => {
  const t0 = performance.now();
  let last = t0;
  const it = sweep(e.data.params, e.data.samples);
  try {
    for (let r = it.next(); ; r = it.next()) {
      if (r.done) { self.postMessage({ type: 'done', summary: summarize(r.value), ms: performance.now() - t0 }); return; }
      if (performance.now() - last > PROGRESS_MS) {
        last = performance.now();
        self.postMessage({ type: 'progress', summary: summarize(r.value), ms: last - t0 });
      }
    }
  } catch (err) { self.postMessage({ type: 'error', error: String(err) }); }
};
