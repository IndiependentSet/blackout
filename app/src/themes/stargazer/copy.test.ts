import { describe, expect, it } from 'vitest';
import { dayNumber } from '../../domain/calendar';
import type { SiteResult } from '../../domain/types';
import { monthOf, nameIdeas, nightDate, nightShareText, planetOf, weekOf, whenNamed } from './copy';

const day = dayNumber(Date.UTC(2026, 9, 20, 12));   // Tue 20 Oct 2026

describe('calendars', () => {
  it('dates a night and finds its week, Monday first', () => {
    expect(nightDate(day)).toBe('Tue 20 Oct');
    const week = weekOf(day);
    expect(week.map(w => w.label).join('')).toBe('MTWTFSS');
    expect(week[1].day).toBe(day);
  });
  it('lists the month a night falls in', () => {
    const m = monthOf(day);
    expect(m.name).toBe('October');
    expect(m.days).toHaveLength(31);
    expect(m.days[19]).toBe(day);
    expect(m.lead).toBe(3);   // 1 Oct 2026 is a Thursday: Mon, Tue, Wed come first
  });
  it('says tonight and yesterday in the atlas', () => {
    expect(whenNamed(day, day)).toBe(`No. ${day} · tonight`);
    expect(whenNamed(day - 1, day)).toBe(`No. ${day - 1} · yesterday`);
  });
});

describe('names and sharing', () => {
  it('suggests the same three different names to everyone on a night', () => {
    const ideas = nameIdeas(412);
    expect(ideas).toHaveLength(3);
    expect(new Set(ideas).size).toBe(3);
    expect(nameIdeas(412)).toEqual(ideas);
  });
  it('shares a star per sky', () => {
    const par = { status: 'perfect' } as SiteResult;
    const over = { status: 'over' } as SiteResult;
    expect(nightShareText(412, [par, over, null])).toBe('Stargazer No. 412 · 1/3 at par\n★☆·');
  });
  it('gives each chapter a world, and keeps out-of-range ones on the last', () => {
    expect(planetOf(3).name).toBe('Mars');
    expect(planetOf(99).name).toBe('Neptune');
  });
});
