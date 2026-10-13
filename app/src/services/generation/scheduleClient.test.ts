import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SCHEDULE, levelsForDay } from '../../domain/generation';
import { previewDayAsync, siteLevelAsync, type PreviewWorker } from './scheduleClient';
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

describe('previewDay with `only`', () => {
  it('makes just that site, the one the full day would have made', () => {
    const one = previewDay({ schedule: DEFAULT_SCHEDULE, daySeed: 40, only: 1 });
    expect(one).toHaveLength(1);
    expect(one[0].level).toEqual(levelsForDay(DEFAULT_SCHEDULE, 40)[1]);
  });
});

describe('siteLevelAsync', () => {
  it('asks the worker for one site and answers its level', async () => {
    const w: PreviewWorker = {
      onmessage: null, onerror: null, terminate: vi.fn(),
      postMessage(req) { queueMicrotask(() => w.onmessage?.({ data: { ok: true, result: previewDay(req) } } as MessageEvent)); },
    };
    const r = await siteLevelAsync(DEFAULT_SCHEDULE, 12, 0, { spawn: () => w });
    expect(r).toEqual({ ok: true, data: levelsForDay(DEFAULT_SCHEDULE, 12)[0] });
    expect(w.terminate).toHaveBeenCalledOnce();
  });
  it('fails for a site the schedule does not have', async () => {
    const w: PreviewWorker = {
      onmessage: null, onerror: null, terminate: vi.fn(),
      postMessage(req) { queueMicrotask(() => w.onmessage?.({ data: { ok: true, result: previewDay(req) } } as MessageEvent)); },
    };
    expect((await siteLevelAsync(DEFAULT_SCHEDULE, 12, 9, { spawn: () => w })).ok).toBe(false);
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
