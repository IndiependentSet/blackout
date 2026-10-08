import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SCHEDULE, levelsForDay } from '../../domain/generation';
import { previewDayAsync, type PreviewWorker } from './scheduleClient';
import { previewDay } from './schedulePreview';

beforeAll(() => { vi.spyOn(Date, 'now').mockReturnValue(0); });
afterAll(() => { vi.restoreAllMocks(); });

describe('previewDay', () => {
  it('makes the same levels the game would, with which rule made each and how long it took', () => {
    let t = 0;
    const out = previewDay({ schedule: DEFAULT_SCHEDULE, daySeed: 40 }, () => (t += 5));
    expect(out.map(s => s.level)).toEqual(levelsForDay(DEFAULT_SCHEDULE, 40));
    expect(out.every(s => s.ms === 5)).toBe(true);
    expect(out.every(s => s.salt !== null)).toBe(true);
  });
});

describe('previewDayAsync', () => {
  it('answers what the worker posts and stops it', async () => {
    const w: PreviewWorker = {
      onmessage: null, onerror: null, terminate: vi.fn(),
      postMessage(req) { queueMicrotask(() => w.onmessage?.({ data: { ok: true, result: previewDay(req) } } as MessageEvent)); },
    };
    const r = await previewDayAsync(DEFAULT_SCHEDULE, 12, { spawn: () => w });
    expect(r.ok && r.data).toHaveLength(7);
    expect(w.terminate).toHaveBeenCalledOnce();
  });
});
