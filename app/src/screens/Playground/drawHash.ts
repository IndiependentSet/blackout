/* The playground's hand-drawn sky in the URL hash, beside the generator's settings: `sky=<encodeFigure>` while
   drawing, so a sketch is a permalink like a set of settings is. Pure. */
import { decodeFigure, encodeFigure, EMPTY_FIGURE } from '../../domain/generation';
import type { SkyFigure } from '../../domain/types';

export type Source = 'generate' | 'draw';

export function readDrawing(hash: string): { source: Source; figure: SkyFigure } {
  const raw = new URLSearchParams(hash.replace(/^#/, '')).get('sky');
  const figure = raw === null ? null : decodeFigure(raw);
  return figure ? { source: 'draw', figure } : { source: 'generate', figure: EMPTY_FIGURE };
}

/** The params part of the hash (encodeParams) with the drawing added while drawing. */
export function withDrawing(paramsHash: string, source: Source, figure: SkyFigure): string {
  if (source !== 'draw') return paramsHash;
  const q = new URLSearchParams(paramsHash);
  q.set('sky', encodeFigure(figure));
  return q.toString();
}
