import { useState } from 'react';
import { togglePlaced } from './play';

const NONE: number[] = [];

/** The cats placed while play-testing, shared by both views. Anything placed
    belongs to one generated level: a new `levelKey` starts from an empty board. */
export function usePlacement(levelKey: string) {
  const [state, setState] = useState({ key: levelKey, placed: NONE });
  const placed = state.key === levelKey ? state.placed : NONE;
  return {
    placed,
    toggle: (node: number) => setState(s => ({ key: levelKey, placed: togglePlaced(s.key === levelKey ? s.placed : NONE, node) })),
    clear: () => setState({ key: levelKey, placed: NONE }),
  };
}
