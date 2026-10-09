/* The game modes level generation can be configured for. Only the daily week
   exists today; an on-demand mode joins this list (and the SQL check on
   generation_configs.mode) when it is built. */
export const GAME_MODES = ['daily'] as const;
export type GameMode = (typeof GAME_MODES)[number];

export const GAME_MODE_LABEL: Record<GameMode, string> = {
  daily: 'Daily week',
};

/* The modes whose levels come from a published pool (public.level_pools):
   made ahead of time from a LevelCurve, never generated while someone plays. */
export const POOL_MODES = ['campaign', 'survival', 'match'] as const;
export type PoolMode = (typeof POOL_MODES)[number];

export const POOL_MODE_LABEL: Record<PoolMode, string> = {
  campaign: 'Campaign',
  survival: 'Survival',
  match: '1vs1',
};
