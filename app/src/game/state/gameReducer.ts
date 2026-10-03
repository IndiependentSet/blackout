import { coveredEdges, isCleared } from '../../domain/cover';
import { keepBest, scoreRun } from '../../domain/scoring';
import { LAST_SITE, SITE_COUNT, isSiteIndex } from '../../domain/sites';
import type { Hint, HintTier, Level, SiteResult } from '../../domain/types';
import { OVER_PAR_ALLOWANCE } from '../constants';
import { consult } from './hints';

/** Something that happened which the outside world should react to (sound, saving, the score card). */
export type GameEvent =
  | { seq: number; kind: 'hired'; node: number; count: number; gained: number }
  | { seq: number; kind: 'cleared'; node: number; count: number; gained: number; run: SiteResult; prevScore: number }
  | { seq: number; kind: 'recalled'; count: number }
  | { seq: number; kind: 'refused' }
  | { seq: number; kind: 'reset' }
  | { seq: number; kind: 'entered'; idx: number };

export interface GameState {
  /** which site is open */
  idx: number;
  /** nodes with a cat on them, in the order they were hired */
  placed: number[];
  /** best run per site */
  results: (SiteResult | null)[];
  hint: Hint | null;
  msg: string;
  /** keyboard focus */
  focus: number;
  /** true once the keyboard has been used, so the focus ring only shows then */
  kbd: boolean;
  /** the latest thing that happened; `seq` lets a consumer react to each one exactly once */
  event: GameEvent | null;
}

export type GameAction =
  | { type: 'tap'; node: number; lv: Level }
  | { type: 'reset' }
  | { type: 'go'; idx: number }
  | { type: 'consult'; tier: HintTier; lv: Level }
  | { type: 'focus'; node: number }
  | { type: 'keyboard' }
  | { type: 'notice'; msg: string };

export const REFUSED_MSG = 'PAYROLL SAYS NO — RECALL SOMEONE';

export const initialGameState = (): GameState => ({
  idx: 0, placed: [], results: Array(SITE_COUNT).fill(null),
  hint: null, msg: '', focus: 0, kbd: false, event: null,
});

const nextSeq = (s: GameState) => (s.event ? s.event.seq + 1 : 1);

function tap(s: GameState, lv: Level, node: number): GameState {
  const seq = nextSeq(s);
  const at = s.placed.indexOf(node);

  /* tapping a cat sends it home */
  if (at >= 0) {
    const placed = s.placed.filter((_, i) => i !== at);
    return {
      ...s, placed, msg: '', focus: node,
      hint: s.hint && s.hint.kind === 'reveal' ? null : s.hint,
      event: { seq, kind: 'recalled', count: placed.length + 1 },
    };
  }
  if (isCleared(lv, s.placed)) return s;
  if (s.placed.length >= lv.k + OVER_PAR_ALLOWANCE) {
    return { ...s, msg: REFUSED_MSG, focus: node, event: { seq, kind: 'refused' } };
  }

  const before = coveredEdges(lv, s.placed).size;
  const placed = [...s.placed, node];
  const gained = coveredEdges(lv, placed).size - before;
  const base = { ...s, placed, focus: node, hint: null, msg: '' };

  if (!isCleared(lv, placed)) {
    return { ...base, event: { seq, kind: 'hired', node, count: placed.length, gained } };
  }
  const run = scoreRun(lv, placed.length);
  const prev = s.results[s.idx];
  const results = s.results.slice();
  results[s.idx] = keepBest(prev, run);
  return {
    ...base, results,
    event: { seq, kind: 'cleared', node, count: placed.length, gained, run, prevScore: prev ? prev.score : 0 },
  };
}

export function gameReducer(s: GameState, a: GameAction): GameState {
  switch (a.type) {
    case 'tap':
      return tap(s, a.lv, a.node);
    case 'reset':
      return { ...s, placed: [], hint: null, msg: '', focus: 0, event: { seq: nextSeq(s), kind: 'reset' } };
    case 'go':
      if (!isSiteIndex(a.idx)) return s;
      return { ...s, idx: a.idx, placed: [], hint: null, msg: '', focus: 0, event: { seq: nextSeq(s), kind: 'entered', idx: a.idx } };
    case 'consult': {
      const { hint, msg } = consult(a.lv, s.placed, a.tier);
      return { ...s, hint, msg };
    }
    case 'focus':
      return { ...s, focus: a.node };
    case 'keyboard':
      return s.kbd ? s : { ...s, kbd: true };
    case 'notice':
      return { ...s, msg: a.msg };
  }
}

export const isLastSite = (idx: number) => idx >= LAST_SITE;
