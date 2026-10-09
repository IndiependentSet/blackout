/* Generates one level of a pool off the main thread, for the admin pool page:
   a big slot can keep the solver busy for seconds. */
import { generateSlotTimed, type SlotRequest } from './poolGeneration';

self.onmessage = (e: MessageEvent<SlotRequest>) => {
  try { self.postMessage({ ok: true, result: generateSlotTimed(e.data) }); }
  catch (err) { self.postMessage({ ok: false, error: String(err) }); }
};
