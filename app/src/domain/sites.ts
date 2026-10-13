import type { PlaySet } from './types';

/* CATASTROPHE INC.: the "houses" are demolition sites on the weekly job sheet */
export const SITES = [
  'THE STUDIO FLAT', 'GRANDMA’S PARLOUR', 'THE OPEN-PLAN LOFT', 'SUBURBAN SEMI',
  'THE MANOR ANNEXE', 'CORNER PENTHOUSE', 'THE OLD RECTORY',
] as const;

export const SITE_COUNT = SITES.length;
export const LAST_SITE = SITE_COUNT - 1;

export const isSiteIndex = (i: number) => Number.isInteger(i) && i >= 0 && i <= LAST_SITE;

/** The daily job sheet, described the way every game mode's levels are. */
export const DAILY_SET: PlaySet = {
  count: SITE_COUNT,
  name: i => SITES[i],
  unitLabel: 'SITE',
  finishLabel: 'SHIFT DONE',
};
