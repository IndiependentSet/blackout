/* A player's own numbers, as `player_stats()` answers them (app/sql/2026-10-31-player-stats.sql, whose header says what
   each one counts). The server sends JSON; `parseStats` turns it into this shape and never throws, so a field a newer or
   older server leaves out reads as zero. Pure. */

export type DuelResultMark = 'won' | 'lost' | 'drawn';

export interface PlayerStats {
  nights: { played: number; perfect: number; skies: number; atPar: number; points: number; bestPoints: number; firstDay: number | null };
  streak: { current: number; best: number };
  voyage: { levels: number; stars: number; atPar: number; points: number };
  rush: { runs: number; bestSites: number; bestScore: number; totalSites: number };
  duel: {
    /** null before the first ranked duel */
    rating: number | null;
    /** ranked duels played */
    games: number;
    peak: number | null;
    played: number;
    won: number;
    lost: number;
    drawn: number;
    /** rating gained in ranked duels this month, and how many duels that was */
    seasonGain: number;
    seasonGames: number;
    /** the last five results, newest first */
    form: DuelResultMark[];
    /** the rating after each of the last 30 ranked duels, oldest first */
    history: number[];
  };
}

type Json = Record<string, unknown>;

const obj = (v: unknown): Json => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {});
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const MARKS: readonly string[] = ['won', 'lost', 'drawn'];

export function parseStats(raw: unknown): PlayerStats {
  const root = obj(raw);
  const n = obj(root.nights), s = obj(root.streak), v = obj(root.voyage), r = obj(root.rush), d = obj(root.duel);
  return {
    nights: {
      played: num(n.played), perfect: num(n.perfect), skies: num(n.skies), atPar: num(n.at_par),
      points: num(n.points), bestPoints: num(n.best_points), firstDay: numOrNull(n.first_day),
    },
    streak: { current: num(s.current), best: num(s.best) },
    voyage: { levels: num(v.levels), stars: num(v.stars), atPar: num(v.at_par), points: num(v.points) },
    rush: { runs: num(r.runs), bestSites: num(r.best_sites), bestScore: num(r.best_score), totalSites: num(r.total_sites) },
    duel: {
      rating: numOrNull(d.rating), games: num(d.games), peak: numOrNull(d.peak),
      seasonGain: num(d.season_gain), seasonGames: num(d.season_games),
      played: num(d.played), won: num(d.won), lost: num(d.lost), drawn: num(d.drawn),
      form: (Array.isArray(d.form) ? d.form : []).filter((m): m is DuelResultMark => typeof m === 'string' && MARKS.includes(m)),
      history: (Array.isArray(d.history) ? d.history : []).filter((x): x is number => typeof x === 'number' && Number.isFinite(x)),
    },
  };
}

/** A whole-number percentage of `part` in `whole`; null when there is no whole to take it of. */
export const percent = (part: number, whole: number): number | null => (whole > 0 ? Math.round((part / whole) * 100) : null);

/** Whether the player has done anything at all, so a brand-new page can say so instead of printing zeros. */
export const hasPlayed = (s: PlayerStats): boolean =>
  s.nights.skies > 0 || s.voyage.levels > 0 || s.rush.runs > 0 || s.duel.played > 0;

/** The points of a sparkline: `values` spread over `width` x `height`, the lowest at the bottom. One value is a flat line mid-height. */
export function sparkPoints(values: readonly number[], width: number, height: number): [number, number][] {
  if (values.length === 0) return [];
  const lo = Math.min(...values), hi = Math.max(...values);
  const x = (i: number) => (values.length === 1 ? width / 2 : (i / (values.length - 1)) * width);
  const y = (v: number) => (hi === lo ? height / 2 : height - ((v - lo) / (hi - lo)) * height);
  return values.map((v, i) => [x(i), y(v)]);
}
