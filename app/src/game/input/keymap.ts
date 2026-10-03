import type { Direction } from '../../domain/navigation';
import { isDirection } from '../../domain/navigation';
import type { HintTier } from '../../domain/types';

export type KeyAction =
  | { type: 'recall' } | { type: 'next' } | { type: 'fit' } | { type: 'expand' } | { type: 'dim' }
  | { type: 'zoom'; by: number }
  | { type: 'consult'; tier: HintTier }
  | { type: 'activate' }
  | { type: 'move'; dir: Direction };

const LETTERS: Record<string, KeyAction> = {
  r: { type: 'recall' }, n: { type: 'next' }, f: { type: 'fit' }, e: { type: 'expand' }, d: { type: 'dim' },
};

export const ZOOM_IN = 1.25, ZOOM_OUT = 0.8;

/** What a key does on the board; null for keys the game ignores. */
export function keyAction(key: string): KeyAction | null {
  const letter = LETTERS[key.toLowerCase()];
  if (key.length === 1 && letter) return letter;
  if (key === '+' || key === '=') return { type: 'zoom', by: ZOOM_IN };
  if (key === '-' || key === '_') return { type: 'zoom', by: ZOOM_OUT };
  if (key === '1' || key === '2' || key === '3') return { type: 'consult', tier: +key as HintTier };
  if (key === 'Enter' || key === ' ') return { type: 'activate' };
  if (isDirection(key)) return { type: 'move', dir: key };
  return null;
}
