import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generate } from '../../domain/generation';
import type { Level } from '../../domain/types';

let response: { data?: unknown; error?: { message: string; code?: string } | null } = {};
const calls: { method: string; args: unknown[] }[] = [];

vi.mock('../supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      calls.push({ method: 'from', args: [table] });
      const q: unknown = new Proxy({}, {
        get(_t, prop: string) {
          if (prop === 'then') return (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null, ...response });
          return (...args: unknown[]) => { calls.push({ method: prop, args }); return q; };
        },
      });
      return q;
    },
  },
  APP_BASE_URL: 'http://localhost',
}));
vi.mock('../logger', () => ({ logger: { error: vi.fn() } }));

const { getDailyLevels } = await import('./dailyLevels');

const made = (seed: number): Level => {
  const { level } = generate({ seed, size: 6, diff: 1, options: { clock: false } });
  if (!level) throw new Error('no level');
  return level;
};
const week = (): Level[] => Array.from({ length: 7 }, (_, i) => made(i + 1));
const rows = (levels: Level[]) => levels.map((level, idx) => ({ idx, level: JSON.parse(JSON.stringify(level)) }));

beforeEach(() => { response = {}; calls.length = 0; });

describe('getDailyLevels', () => {
  it('asks for the day in site order', async () => {
    response = { data: rows(week()) };
    await getDailyLevels(42);
    expect(calls).toContainEqual({ method: 'from', args: ['daily_levels'] });
    expect(calls).toContainEqual({ method: 'eq', args: ['day', 42] });
    expect(calls).toContainEqual({ method: 'order', args: ['idx'] });
  });
  it('hands back the seven levels, whatever order the rows come in', async () => {
    const levels = week();
    response = { data: rows(levels).reverse() };
    expect(await getDailyLevels(42)).toEqual({ ok: true, data: JSON.parse(JSON.stringify(levels)) });
  });
  it('answers null while the week is not published, or only partly', async () => {
    response = { data: [] };
    expect(await getDailyLevels(42)).toEqual({ ok: true, data: null });
    response = { data: rows(week()).slice(0, 6) };
    expect(await getDailyLevels(42)).toEqual({ ok: true, data: null });
  });
  it('does not trust a row that is not a level', async () => {
    const bad = rows(week());
    bad[3] = { idx: 3, level: { nodes: [] } };
    response = { data: bad };
    expect(await getDailyLevels(42)).toEqual({ ok: true, data: null });
  });
  it('treats a table that is not there yet as not published', async () => {
    response = { error: { message: 'relation does not exist', code: '42P01' } };
    expect(await getDailyLevels(42)).toEqual({ ok: true, data: null });
  });
  it('reports any other failure', async () => {
    response = { error: { message: 'boom' } };
    expect(await getDailyLevels(42)).toEqual({ ok: false, error: 'boom' });
  });
});
