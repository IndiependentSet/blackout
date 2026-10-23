/* The admin pages, in the order the nav and the profile list them. Pure: the admin frame, the Observatory and the
   staff office all read it, so the list lives once.

   They come in two groups: where levels go (a page per game mode: Tonight's schedule, and a pool per pool mode) and
   how they are made (the shared recipes, and the playground every rule can be tried in). */
import { POOL_MODES, type PoolMode } from './gameModes';

export const ADMIN_GROUPS = [
  { id: 'where', label: 'Where levels go' },
  { id: 'how', label: 'How they’re made' },
] as const;

export type AdminGroupId = (typeof ADMIN_GROUPS)[number]['id'];

export const ADMIN_PAGES = [
  { id: 'tonight', group: 'where', href: '/generation.html', label: 'Tonight', hint: 'the seven skies of the daily week, saved from a future day' },
  { id: 'voyage', group: 'where', href: '/pools.html?mode=campaign', label: 'Voyage', hint: 'the 100 voyage levels: curve, generate, play-test, publish' },
  { id: 'rush', group: 'where', href: '/pools.html?mode=survival', label: 'Meteor Rush', hint: 'the tiers a Meteor Rush run deepens through' },
  { id: 'duel', group: 'where', href: '/pools.html?mode=match', label: 'Star Duel', hint: 'the duel tiers (a nightly job republishes them from the default curve)' },
  { id: 'recipes', group: 'how', href: '/recipes.html', label: 'Recipes', hint: 'named sky shapes, applied to skies and tiers' },
  { id: 'playground', group: 'how', href: '/playground.html', label: 'Playground', hint: 'the generator with every rule exposed' },
] as const satisfies readonly { id: string; group: AdminGroupId; href: string; label: string; hint: string }[];

export type AdminPageId = (typeof ADMIN_PAGES)[number]['id'];

/** The admin page for each pool mode. */
export const POOL_PAGE: Record<PoolMode, AdminPageId> = { campaign: 'voyage', survival: 'rush', match: 'duel' };

/** Which pool mode a pools page URL is for (`?mode=…`); Voyage when it doesn't say, or says something else. */
export function poolModeFromSearch(search: string): PoolMode {
  const m = new URLSearchParams(search).get('mode');
  return (POOL_MODES as readonly string[]).includes(m ?? '') ? (m as PoolMode) : 'campaign';
}
