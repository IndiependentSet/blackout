import { fail } from '../result';
import { getCampaignLevel, getSurvivalLevel } from '../repositories/levelPools';
import type { LevelSource } from './levelSource';

/* Levels from the published pools. Campaign and survival ask the server, which owns the choice. A 1vs1 level is
   picked by the server when the challenge is made and stored in the match, so nobody asks for one here. */
export const poolLevelSource: LevelSource = {
  getLevel(req) {
    switch (req.mode) {
      case 'campaign': return getCampaignLevel(req.levelNo);
      case 'survival': return getSurvivalLevel(req.runSeed, req.step);
      case 'match': return Promise.resolve(fail('a 1vs1 level comes with the match'));
    }
  },
};
