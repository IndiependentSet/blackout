import { describe, expect, it } from 'vitest';
import seedSql from '../../sql/2026-10-16-badges.sql?raw';
import { BADGES, heldBadges } from './badges';
import { CHAPTERS } from './campaign';

describe('badge catalogue', () => {
  it('has six badges with unique ids and names', () => {
    expect(BADGES).toHaveLength(6);
    expect(new Set(BADGES.map(b => b.id)).size).toBe(6);
    expect(new Set(BADGES.map(b => b.name)).size).toBe(6);
  });

  it('keeps the six ids the cosmetics unlock from', () => {
    expect(BADGES.map(b => b.id)).toEqual(
      ['purrfect-shift', 'streak-7', 'streak-30', 'chapter-clear', 'campaign-3-stars', 'first-duel-win']);
  });

  it('gives every badge a name and a description to show', () => {
    for (const b of BADGES) {
      expect(b.name.trim()).not.toBe('');
      expect(b.description.trim()).not.toBe('');
    }
  });
});

describe('heldBadges', () => {
  it('lists held badges in catalogue order, whatever order they were earned in', () => {
    const held = heldBadges([
      { id: 'first-duel-win', earnedAt: '2026-10-02T10:00:00Z' },
      { id: 'streak-7', earnedAt: '2026-10-01T10:00:00Z' },
    ]);
    expect(held.map(b => b.id)).toEqual(['streak-7', 'first-duel-win']);
  });

  it('leaves out an id this build does not know', () => {
    expect(heldBadges([{ id: 'from-the-future', earnedAt: '2026-10-01T10:00:00Z' }])).toEqual([]);
  });

  it('is empty for no badges', () => {
    expect(heldBadges([])).toEqual([]);
  });
});

describe('the client catalogue against app/sql/2026-10-16-badges.sql', () => {
  it('seeds exactly these ids, names and descriptions', () => {
    const seeded = [...seedSql.matchAll(/\('([a-z0-9-]+)',\s*'([^']*)',\s*'([^']*)'\)/g)]
      .map(m => ({ id: m[1], name: m[2], description: m[3] }));
    expect(seeded).toEqual(BADGES.map(b => ({ id: b.id, name: b.name, description: b.description })));
  });

  it('copies the campaign chapter bounds from CHAPTERS', () => {
    const block = /\(values ((?:\(\d+, \d+\)(?:, )?)+)\) as ch\(lo, hi\)/.exec(seedSql);
    expect(block).not.toBeNull();
    const bounds = [...(block as RegExpExecArray)[1].matchAll(/\((\d+), (\d+)\)/g)].map(m => [Number(m[1]), Number(m[2])]);
    expect(bounds).toEqual(CHAPTERS.map(c => [c.from, c.to]));
  });

  it('gives the client no way to write player_badges', () => {
    expect(seedSql).not.toMatch(/grant\s+[^;]*\b(insert|update|delete|all)\b[^;]*player_badges/i);
    expect(seedSql).not.toMatch(/create policy[^;]*player_badges[^;]*for\s+(insert|update|delete|all)/i);
    for (const fn of ['award_daily_badges(uuid)', 'award_campaign_badges(uuid)', 'award_duel_badges(uuid)']) {
      expect(seedSql).toContain(`revoke all on function public.${fn} from public, anon, authenticated;`);
    }
  });

  it('never lets a badge bug stop the clear that fired it', () => {
    expect(seedSql.match(/exception when others then/g)).toHaveLength(3);
  });
});
