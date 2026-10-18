import { useCallback, useState } from 'react';
import { prefersMoreContrast } from '../env';
import type { PlaySession } from '../session';

/* How the player likes the board shown (expanded frame, house dimmed), kept by the session so it survives leaving the game screen. */
export function useBoardView(): PlaySession['view'] {
  const [expanded, setExpanded] = useState(false);
  /* someone who has asked their system for more contrast gets the house turned down from the start */
  const [dim, setDim] = useState(prefersMoreContrast);
  const toggleExpanded = useCallback(() => setExpanded(v => !v), []);
  const toggleDim = useCallback(() => setDim(v => !v), []);
  return { expanded, dim, toggleExpanded, toggleDim };
}
