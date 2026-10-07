import { describe, expect, it } from 'vitest';
import { DEFAULT_SCHEDULE, parseOptions, parseSchedule } from '.';

const clone = () => JSON.parse(JSON.stringify(DEFAULT_SCHEDULE));
const errorsOf = (raw: unknown) => {
  const r = parseSchedule(raw);
  return r.ok ? [] : r.errors;
};

describe('parseSchedule', () => {
  it('accepts the default schedule and returns an equal copy', () => {
    const r = parseSchedule(clone());
    expect(r).toEqual({ ok: true, value: DEFAULT_SCHEDULE });
  });

  it('drops nothing it understands and nothing undefined', () => {
    const r = parseSchedule(clone());
    if (!r.ok) throw new Error(r.errors.join('\n'));
    expect(JSON.stringify(r.value)).toBe(JSON.stringify(DEFAULT_SCHEDULE));
  });

  it('rejects what is not a schedule', () => {
    expect(errorsOf(null)).toEqual(['schedule: expected an object']);
    expect(errorsOf({ ...clone(), version: 2 })).toEqual(['schedule.version: expected 1, got 2']);
  });

  it('wants one rule per site', () => {
    const s = clone(); s.sites.pop();
    expect(errorsOf(s)).toEqual([`schedule.sites: expected ${DEFAULT_SCHEDULE.sites.length} sites, got ${DEFAULT_SCHEDULE.sites.length - 1}`]);
  });

  it('keeps numbers inside the limits', () => {
    const s = clone();
    s.sites[2].size = 500;
    s.sites[3].options.reach = 9;
    s.sites[4].diff = 4;
    s.sites[5].options.attempts = 2.5;
    expect(errorsOf(s)).toEqual([
      'schedule.sites[2].size: 500 is outside 4–80',
      'schedule.sites[3].options.reach: 9 is outside 1–3.2',
      'schedule.sites[4].diff: 4 is outside 1–3',
      'schedule.sites[5].options.attempts: expected a whole number',
    ]);
  });

  it('checks gadget menus', () => {
    const s = clone();
    s.sites[0].options.menu = ['spur', 'blob'];
    s.sites[1].options.menu = [];
    s.sites[2].options.menu = Array(10).fill('hub');
    expect(errorsOf(s)).toEqual([
      'schedule.sites[0].options.menu: unknown gadget blob',
      'schedule.sites[1].options.menu: the menu is empty, so nothing can be grown',
      'schedule.sites[2].options.menu: hub appears 10 times (at most 9)',
    ]);
  });

  it('checks degrees against each other, defaults included', () => {
    const s = clone();
    s.sites[0].options.minDegree = 4;      // default max is 3
    expect(errorsOf(s)).toEqual(['schedule.sites[0].options: minDegree 4 is above maxDegree 3']);
  });

  it('names unknown settings instead of ignoring them', () => {
    const s = clone();
    s.sites[0].options.planar = true;
    s.sites[0].constraints.minEdges = 3;
    expect(errorsOf(s)).toEqual([
      'schedule.sites[0].options.planar: unknown setting',
      'schedule.sites[0].constraints.minEdges: unknown setting',
    ]);
  });
});

describe('parseSchedule and the free strategy', () => {
  it('accepts a site switched to free', () => {
    const s = clone();
    s.sites[3].options = { ...s.sites[3].options, strategy: 'free', density: 2.8, spread: 2, lengthBias: 0.5, girth: 4, maxOptima: 2, greedyMustFail: true, minBoundGap: 1 };
    const r = parseSchedule(s);
    expect(r.ok && r.value.sites[3].options).toEqual(s.sites[3].options);
  });

  it('rejects an unknown strategy and free settings out of range', () => {
    const s = clone();
    s.sites[0].options.strategy = 'fractal';
    s.sites[1].options.density = 9;
    s.sites[2].options.girth = 2;
    expect(errorsOf(s)).toEqual([
      'schedule.sites[0].options.strategy: unknown strategy "fractal" (expected gadgets or free)',
      'schedule.sites[1].options.density: 9 is outside 1–5',
      'schedule.sites[2].options.girth: 2 is outside 3–6',
    ]);
  });

  it('no longer knows the old uniqueness switch', () => {
    const s = clone();
    s.sites[0].options.unique = false;
    expect(errorsOf(s)).toEqual(['schedule.sites[0].options.unique: unknown setting']);
  });
});

describe('parseOptions', () => {
  it('accepts a partial option set', () => {
    expect(parseOptions({ crossings: true, extraEdges: null, menu: null })).toEqual(
      { ok: true, value: { crossings: true, extraEdges: null, menu: null } });
  });

  it('reports a wrong type', () => {
    expect(parseOptions({ greedyMustFail: 'yes' })).toEqual({ ok: false, errors: ['options.greedyMustFail: expected true or false'] });
  });
});
