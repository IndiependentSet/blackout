import type { Level, LevelRequest } from '../../domain/types';
import { CAMPAIGN_LEVELS } from '../../domain/types';
import { fail, ok } from '../result';
import { BASE_MAPS } from './fixtures/baseMaps';
import type { LevelSource } from './levelSource';

/* MOCK provvisorio: sostituire con il backend. Restituisce sempre una delle
   mappe fisse di BASE_MAPS, scelta in modo deterministico dalla richiesta. */

const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

export function mockIndex(req: LevelRequest, count: number): number | null {
  switch (req.mode) {
    case 'campaign':
      return Number.isInteger(req.levelNo) && req.levelNo >= 1 && req.levelNo <= CAMPAIGN_LEVELS
        ? (req.levelNo - 1) % count : null;
    case 'survival':
      return Number.isInteger(req.step) && req.step >= 0 ? (hash(req.runSeed) + req.step) % count : null;
    case 'match':
      return req.matchId ? hash(req.matchId) % count : null;
  }
}

export const mockLevelSource: LevelSource = {
  getLevel(req) {
    const i = mockIndex(req, BASE_MAPS.length);
    const lv: Level | undefined = i === null ? undefined : BASE_MAPS[i];
    return Promise.resolve(lv ? ok(lv) : fail('Invalid level request'));
  },
};
