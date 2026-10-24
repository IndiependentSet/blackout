/* Stargazer's words and calendars: pure, so they can be tested and so every page says things the same way. */
import { dayStartUtc, seasonOf } from '../../domain/calendar';
import { rngFromSeed } from '../../domain/rng';
import { signed } from '../../domain/rating';
import { LADDER_MIN_GAMES, SEASON_MIN_GAMES, type BoardKind } from '../../domain/ranking';
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

/** One-letter weekday labels, Monday first. */
export const WEEK_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Every night of the month a night falls in, the month's name, and how many blank cells put day 1 under its weekday (Monday first). */
export function monthOf(day: number): { name: string; days: number[]; lead: number } {
  const d = dateOf(day);
  const first = day - (d.getUTCDate() - 1);
  const length = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  return { name: MONTHS[d.getUTCMonth()], days: Array.from({ length }, (_, i) => first + i), lead: (dateOf(first).getUTCDay() + 6) % 7 };
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

/** What each leaderboard is called, how it is ordered, and how a row reads. The order is `board_rows`'s (see its SQL). */
export const BOARDS: Record<BoardKind, {
  title: string;
  /** the one line under the title: what is measured and how a tie breaks */
  rule: string;
  /** a row's main number, then the smaller one beside it */
  value: (v: number) => string;
  extra: (v: number) => string;
  /** the page's "no one yet" line, and what the player does to get on it */
  empty: string;
  join: string;
}> = {
  night: {
    title: 'Tonight', rule: 'Points from tonight’s skies. A tie goes to more skies at par, then fewer stars lit.',
    value: v => v + ' pts', extra: v => v + ' at par',
    empty: 'Nobody has charted a sky tonight yet. Be the first.', join: 'Chart a sky tonight to appear here.',
  },
  week: {
    title: 'This week', rule: 'Points from the last seven nights. A tie goes to more skies at par, then more nights played.',
    value: v => v + ' pts', extra: v => v + ' at par',
    empty: 'Nobody has charted a sky this week yet. Be the first.', join: 'Chart a sky to appear here.',
  },
  alltime: {
    title: 'All time', rule: 'Points from every night you’ve charted. A tie goes to more skies at par, then more nights played.',
    value: v => v.toLocaleString() + ' pts', extra: v => v + ' at par',
    empty: 'Nobody has charted a sky yet. Be the first.', join: 'Chart a sky to appear here.',
  },
  voyage: {
    title: 'Furthest voyagers', rule: 'Voyage stars earned, three a level at best. A tie goes to more levels charted, then whoever got there first.',
    value: v => plural(v, 'star'), extra: v => plural(v, 'level'),
    empty: 'Nobody has charted a voyage level yet. Be the first.', join: 'Chart a voyage level to appear here.',
  },
  rush: {
    title: 'Meteor Rush', rule: 'Each player’s best run: the most skies, then the most points.',
    value: v => plural(v, 'sky', 'skies'), extra: v => v.toLocaleString() + ' pts',
    empty: 'No runs yet. Be the first.', join: 'Chart a sky in a rush to appear here.',
  },
  duel: {
    title: 'Duel ladder', rule: `Rating from ranked duels; challenges to friends don’t count. A tie goes to more duels played. You appear after ${LADDER_MIN_GAMES} ranked duels.`,
    value: v => String(v), extra: v => plural(v, 'duel'),
    empty: 'Nobody has played enough ranked duels yet.', join: `Play ${LADDER_MIN_GAMES} ranked duels to appear here.`,
  },
  season: {
    title: 'This month', rule: `Rating gained in ranked duels this month. Everyone starts the month at zero, and your ladder rating isn’t touched. A tie goes to more duels played. You appear after ${SEASON_MIN_GAMES} ranked duels this month.`,
    value: v => signed(v), extra: v => plural(v, 'duel'),
    empty: 'Nobody has played enough ranked duels this month yet.', join: `Play ${SEASON_MIN_GAMES} ranked duels this month to appear here.`,
  },
};

/** The duel season a night falls in, and how long it has left: "October · 9 days left". */
export function seasonText(day: number): string {
  const s = seasonOf(day);
  return `${MONTHS[s.month]} · ${s.daysLeft === 1 ? 'last day' : s.daysLeft + ' days left'}`;
}

/** How far a player is from a ladder they are not on yet: "3 of 5 ranked duels to appear". */
export const ladderProgressText = (games: number, min: number, where: string): string => `${Math.min(games, min)} of ${min} ranked duels to appear ${where}.`;

/** The short names a page's switch between boards shows. */
export const BOARD_TAB: Record<BoardKind, string> = { night: 'Tonight', week: 'This week', alltime: 'All time', voyage: 'Voyage', rush: 'Rush', duel: 'Ladder', season: 'This month' };
