/* Generates a whole day for a schedule off the main thread, for the admin
   config page's preview: seven sites can keep the solver busy for seconds. */
import { previewDay, type PreviewRequest } from './schedulePreview';

self.onmessage = (e: MessageEvent<PreviewRequest>) => {
  try { self.postMessage({ ok: true, result: previewDay(e.data) }); }
  catch (err) { self.postMessage({ ok: false, error: String(err) }); }
};
