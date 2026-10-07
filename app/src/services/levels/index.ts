import type { LevelSource } from './levelSource';
import { mockLevelSource } from './mockLevelSource';

export type { LevelSource } from './levelSource';
export { requestKey } from './levelSource';

/** True while levels come from the fixed mock maps; the UI shows a "DEV MOCK" tag. */
export const IS_MOCK_SOURCE = true;

export const levelSource: LevelSource = mockLevelSource;
