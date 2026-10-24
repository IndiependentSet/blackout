import { chapterOf } from '../../../../domain/campaign';
import { signed } from '../../../../domain/rating';
import type { BoardKind } from '../../../../domain/ranking';
import { percent, type PlayerStats } from '../../../../domain/stats';
import { CAMPAIGN_LEVELS } from '../../../../domain/types';
import { planetOf, plural } from '../../copy';

export type Mode = 'nights' | 'voyage' | 'rush' | 'duel';
export const MODES: { id: Mode; label: string }[] = [
  { id: 'nights', label: 'Nights' }, { id: 'voyage', label: 'Voyage' }, { id: 'rush', label: 'Rush' }, { id: 'duel', label: 'Duel' },
];

/** What a mode's page says: one hero number, a line of context, and a few label → value rows. */
export interface StatsView {
  tone: 'mint' | 'mars';
  /** the mode's name, in its colour */
  eyebrow: string;
  /** what the hero number counts, for the desktop's mode cards */
  heroLabel: string;
  hero: string;
  heroSub: string;
  rows: [label: string, value: string][];
  /** set when the mode has not been played: its sentence replaces the hero's context and the rows are empty */
  empty: string | null;
  /** the boards the Leaderboard button opens, the first being the one whose place it shows */
  kinds: BoardKind[];
  /** what the place is a place on: "this week", "among voyagers" */
  placeLabel: string;
}

const num = (n: number) => n.toLocaleString();
const pct = (part: number, whole: number) => { const p = percent(part, whole); return p === null ? '—' : p + '%'; };

export function statsView(s: PlayerStats, mode: Mode): StatsView {
  switch (mode) {
    case 'nights': {
      const n = s.nights;
      return {
        tone: 'mint', eyebrow: 'Nights', heroLabel: 'nights charted', hero: String(n.played), empty: null,
        heroSub: `${plural(n.perfect, 'perfect night')} · streak ${s.streak.current}, best ${s.streak.best}`,
        rows: [['Skies charted', num(n.skies)], ['Skies at par', pct(n.atPar, n.skies)], ['Total points', num(n.points)], ['Best night', String(n.bestPoints)]],
        kinds: ['week', 'night', 'alltime'], placeLabel: 'this week',
      };
    }
    case 'voyage': {
      const v = s.voyage;
      const world = planetOf(chapterOf(Math.min(v.levels + 1, CAMPAIGN_LEVELS))?.index ?? 0).name;
      return {
        tone: 'mint', eyebrow: 'Voyage', heroLabel: 'levels charted', hero: `${v.levels} / ${CAMPAIGN_LEVELS}`, empty: null,
        heroSub: `Now on ${world}`,
        rows: [['Stars earned', `${v.stars} of ${CAMPAIGN_LEVELS * 3}`], ['Levels at par', pct(v.atPar, v.levels)]],
        kinds: ['voyage'], placeLabel: 'among voyagers',
      };
    }
    case 'rush': {
      const r = s.rush;
      const none = r.runs === 0;
      return {
        tone: 'mars', eyebrow: 'Meteor Rush', heroLabel: 'best run', hero: none ? '—' : plural(r.bestSites, 'sky', 'skies'), heroSub: `${num(r.bestScore)} points in that run`,
        empty: none ? 'No runs yet. Chart as many skies as you can before dawn.' : null,
        rows: none ? [] : [['Runs played', String(r.runs)], ['Skies in all runs', num(r.totalSites)]],
        kinds: ['rush'], placeLabel: 'in Meteor Rush',
      };
    }
    case 'duel': {
      const d = s.duel;
      const none = d.played === 0 && d.games === 0;
      return {
        tone: 'mint', eyebrow: 'Star Duel', heroLabel: 'rating', hero: d.rating === null ? '—' : String(d.rating), empty: none ? 'No duels yet. Challenge a fellow stargazer, or find a ranked opponent.' : null,
        heroSub: `Peak ${d.peak ?? '—'}${d.seasonGames > 0 ? ` · ${signed(d.seasonGain)} this month` : ''}`,
        rows: none ? [] : [['Ranked duels', String(d.games)], ['Won · lost · tied', `${d.won} · ${d.lost} · ${d.drawn}`], ['Win rate', pct(d.won, d.played)]],
        kinds: ['duel', 'season'], placeLabel: 'on the ladder',
      };
    }
  }
}
