import type { LevelSource } from './levelSource';
import { poolLevelSource } from './poolLevelSource';

export type { LevelSource } from './levelSource';
export { requestKey } from './levelSource';

/** True while levels come from the fixed mock maps (tests); the UI shows a "DEV MOCK" tag. */
export const IS_MOCK_SOURCE = false;

/** Campaign and survival levels: the pools an admin has published. */
export const levelSource: LevelSource = poolLevelSource;
