/** Nights, figures and moons: the pure rules behind Stargazer's atlas and moon calendars. */
import type { Level, Night, SkyFigure } from './types';
import { SITE_COUNT } from './sites';

/** The drawing kept for a named night: the level's stars and lines, never its answer. */
export const figureOf = (lv: Pick<Level, 'nodes' | 'edges'>): SkyFigure => ({
  nodes: lv.nodes.map(n => ({ c: n.c, r: n.r })),
  edges: lv.edges.map(([u, v]) => [u, v]),
});

/** One clear as the nights history reads it. */
export interface ClearRow { day: number; site: number; perfect: boolean }

/** Count each night's charted and at-par skies from its clears (a site counts once). */
export function tallyNights(rows: readonly ClearRow[]): Night[] {
  const byDay = new Map<number, Map<number, boolean>>();
  for (const r of rows) {
    const sites = byDay.get(r.day) ?? new Map<number, boolean>();
    sites.set(r.site, (sites.get(r.site) ?? false) || r.perfect);
    byDay.set(r.day, sites);
  }
  return [...byDay.entries()].sort((a, b) => a[0] - b[0]).map(([day, sites]) => ({
    day, charted: sites.size, perfect: [...sites.values()].filter(Boolean).length,
  }));
}

/** A moon for a night: new when nothing was charted, full when every sky was charted at par, and lit in between
    by the share of skies at par. `fill` is 0..1. */
export type MoonState = 'none' | 'part' | 'full';
export function moonOf(night: Night | undefined, count: number = SITE_COUNT): { state: MoonState; fill: number } {
  if (!night || night.charted === 0) return { state: 'none', fill: 0 };
  if (night.perfect >= count) return { state: 'full', fill: 1 };
  return { state: 'part', fill: Math.max(0.15, night.perfect / count) };
}
