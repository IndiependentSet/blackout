/* Runs a generation off the main thread: a big or dense graph can keep the
   solver busy for seconds, and the controls must stay live meanwhile. */
import type { PlaygroundParams } from './params';
import { runGeneration } from './runGeneration';

self.onmessage = (e: MessageEvent<PlaygroundParams>) => {
  try { self.postMessage({ ok: true, outcome: runGeneration(e.data) }); }
  catch (err) { self.postMessage({ ok: false, error: String(err) }); }
};
