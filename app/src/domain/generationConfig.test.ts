import { describe, expect, it } from 'vitest';
import { DEFAULT_SCHEDULE } from './generation';
import { checkGameSchedule, configForDay, configStatus, earliestEffectiveDay, resolveSchedule, type StoredConfig } from './generationConfig';

const row = (id: number, effectiveFromDay: number, schedule: unknown = DEFAULT_SCHEDULE): StoredConfig =>
  ({ id, mode: 'daily', effectiveFromDay, schedule, note: '', createdAt: '' });

const smaller = { ...DEFAULT_SCHEDULE, retries: 3 };

describe('configForDay', () => {
  const rows = [row(1, 10), row(2, 20), row(3, 15)];
  it('picks the latest config that has taken effect', () => {
    expect(configForDay(rows, 17)?.id).toBe(3);
    expect(configForDay(rows, 20)?.id).toBe(2);
    expect(configForDay(rows, 99)?.id).toBe(2);
  });
  it('has nothing before the first one', () => expect(configForDay(rows, 9)).toBeNull());
});

describe('resolveSchedule', () => {
  it('plays the default with no config', () => {
    expect(resolveSchedule(null)).toEqual({ schedule: DEFAULT_SCHEDULE, source: 'default', errors: [] });
  });
  it('plays a saved schedule', () => {
    const r = resolveSchedule(row(1, 1, smaller));
    expect(r.source).toBe('saved');
    expect(r.schedule.retries).toBe(3);
  });
  it('falls back to the default when the stored schedule does not parse', () => {
    const r = resolveSchedule(row(1, 1, { version: 2 }));
    expect(r.source).toBe('invalid');
    expect(r.schedule).toBe(DEFAULT_SCHEDULE);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

describe('config status', () => {
  const rows = [row(1, 10), row(2, 20), row(3, 15)];
  it('labels past, in force and scheduled configs', () => {
    expect(rows.map(r => configStatus(r, rows, 17))).toEqual(['past', 'scheduled', 'inForce']);
  });
  it('never lets a config take effect today', () => expect(earliestEffectiveDay(17)).toBe(18));
});

describe('game rules', () => {
  const relaxed = { ...DEFAULT_SCHEDULE, sites: DEFAULT_SCHEDULE.sites.map((st, i) => (i === 2 ? { ...st, options: { maxOptima: 3 } } : st)) };
  it('accepts the default', () => expect(checkGameSchedule(DEFAULT_SCHEDULE)).toEqual({ ok: true, value: DEFAULT_SCHEDULE }));
  it('refuses a schedule that allows more than one optimal cover', () => {
    expect(checkGameSchedule(relaxed)).toEqual({ ok: false, errors: ['schedule.sites[2].options.maxOptima: the game needs a unique optimal cover (1)'] });
    const fb = checkGameSchedule({ ...DEFAULT_SCHEDULE, fallback: { diff: 1, options: { maxOptima: 0 } } });
    expect(fb.ok).toBe(false);
  });
  it('never plays one, even if it was stored', () => {
    expect(resolveSchedule(row(1, 1, relaxed)).source).toBe('invalid');
  });
});
