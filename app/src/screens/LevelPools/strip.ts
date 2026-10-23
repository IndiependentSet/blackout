/* What the tier strip draws: a bar per tier, and the recipe bands under it (runs of tiers that match the same recipe,
   or none). Pure. */
import { recipeFor, type CurveTier, type Recipe } from '../../domain/generation';

export interface Band {
  /** the recipe this run of tiers matches, or null (custom) */
  name: string | null;
  /** first and last tier, zero-based */
  from: number;
  to: number;
  /** levels in the run */
  levels: number;
}

export function recipeBands(tiers: readonly CurveTier[], recipes: readonly Recipe[]): Band[] {
  const bands: Band[] = [];
  tiers.forEach((t, i) => {
    const name = recipeFor(t.options, recipes)?.name ?? null;
    const last = bands[bands.length - 1];
    if (last && last.name === name) { last.to = i; last.levels += t.count; }
    else bands.push({ name, from: i, to: i, levels: t.count });
  });
  return bands;
}

/** Each bar's height as a share of the tallest tier (at least a sliver, so a tiny tier is still something to click). */
export function barHeights(tiers: readonly CurveTier[]): number[] {
  const top = Math.max(1, ...tiers.map(t => t.size));
  return tiers.map(t => Math.max(0.08, t.size / top));
}
