/* Generates one level off the main thread: a big or dense graph can keep the
   solver busy for seconds, and the page must stay live meanwhile. */
import { generate, type GenerateRequest } from '../../domain/generation';

self.onmessage = (e: MessageEvent<GenerateRequest>) => {
  try { self.postMessage({ ok: true, result: generate(e.data) }); }
  catch (err) { self.postMessage({ ok: false, error: String(err) }); }
};
