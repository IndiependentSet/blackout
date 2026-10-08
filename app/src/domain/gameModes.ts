/* The game modes level generation can be configured for. Only the daily week
   exists today; an on-demand mode joins this list (and the SQL check on
   generation_configs.mode) when it is built. */
export const GAME_MODES = ['daily'] as const;
export type GameMode = (typeof GAME_MODES)[number];

export const GAME_MODE_LABEL: Record<GameMode, string> = {
  daily: 'Daily week',
};
