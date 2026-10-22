/* Stargazer's words and calendars: pure, so they can be tested and so every page says things the same way. */
import { dayStartUtc } from '../../domain/calendar';
import { rngFromSeed } from '../../domain/rng';
import type { SiteResult } from '../../domain/types';

/** The voyage's chapters, one world each (the campaign's seven, in order). The art is placeholder gradients. */
export const PLANETS = [
  { name: 'The Moon', art: 'moon' },
  { name: 'Mercury', art: 'mercury' },
  { name: 'Venus', art: 'venus' },
  { name: 'Mars', art: 'mars' },
  { name: 'Jupiter’s moons', art: 'jupiter' },
  { name: 'Saturn', art: 'saturn' },
  { name: 'Neptune', art: 'neptune' },
] as const;
export const planetOf = (chapterIndex: number) => PLANETS[Math.min(Math.max(chapterIndex, 0), PLANETS.length - 1)];

const FIRST = ['The Crooked', 'Little', 'The Long', 'The Sleeping', 'Two', 'The Lost', 'Ada’s', 'The Silver', 'The Restless', 'Old', 'The Northern', 'The Hidden'];
const LAST = ['Kite', 'Heron', 'Ladder', 'Lantern', 'Fox', 'Sail', 'Teapot', 'Harp', 'Lighthouse', 'Comet', 'Anchor', 'Owl', 'Bridge', 'Crown'];

/** Three names to start from, the same for everyone on a night. */
export function nameIdeas(day: number, count = 3): string[] {
  const r = rngFromSeed(day * 7919 + 17);
  const out: string[] = [];
  while (out.length < count) {
    const name = FIRST[Math.floor(r() * FIRST.length)] + ' ' + LAST[Math.floor(r() * LAST.length)];
    if (!out.includes(name)) out.push(name);
  }
  return out;
}

/** The night as text to paste anywhere: a gold star per sky at par, a pale one over par, a dot for one not charted. */
export function nightShareText(day: number, results: (SiteResult | null)[]): string {
  const stars = results.map(r => (!r ? '·' : r.status === 'perfect' ? '★' : '☆')).join('');
  const atPar = results.filter(r => r && r.status === 'perfect').length;
  return `Stargazer No. ${day} · ${atPar}/${results.length} at par\n${stars}`;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const dateOf = (day: number) => new Date(dayStartUtc(day));

/** "Tue 20 Oct" for a night. */
export function nightDate(day: number): string {
  const d = dateOf(day);
  return `${WEEKDAY_NAMES[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`;
}

/** The week a night falls in, Monday first: each day's number and its one-letter label. */
export function weekOf(day: number): { day: number; label: string }[] {
  const monday = day - ((dateOf(day).getUTCDay() + 6) % 7);
  return Array.from({ length: 7 }, (_, i) => ({ day: monday + i, label: WEEKDAYS[(i + 1) % 7] }));
}

/** Every night of the month a night falls in, and the month's name. */
export function monthOf(day: number): { name: string; days: number[] } {
  const d = dateOf(day);
  const first = day - (d.getUTCDate() - 1);
  const length = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  return { name: MONTHS[d.getUTCMonth()], days: Array.from({ length }, (_, i) => first + i) };
}

/** How the atlas dates a figure. */
export function whenNamed(day: number, today: number): string {
  if (day === today) return `No. ${day} · tonight`;
  if (day === today - 1) return `No. ${day} · yesterday`;
  return `No. ${day} · ${nightDate(day)}`;
}

export const plural = (n: number, word: string, many = word + 's') => n + ' ' + (n === 1 ? word : many);

/** The server's "nothing published" message, in Stargazer's words. */
export const NO_SKIES = 'No skies are published for this yet. Check back soon.';
