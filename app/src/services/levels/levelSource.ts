import type { Level, LevelRequest } from '../../domain/types';
import type { Result } from '../result';

/** The one way campaign, survival and 1vs1 obtain a level. */
export interface LevelSource {
  getLevel(req: LevelRequest): Promise<Result<Level>>;
}

export const requestKey = (req: LevelRequest): string => {
  switch (req.mode) {
    case 'campaign': return `campaign:${req.levelNo}`;
    case 'survival': return `survival:${req.runSeed}:${req.step}`;
    case 'match': return `match:${req.matchId}`;
  }
};
