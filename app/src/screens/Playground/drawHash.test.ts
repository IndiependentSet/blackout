import { describe, expect, it } from 'vitest';
import { readDrawing, withDrawing } from './drawHash';
import { decodeParams, DEFAULT_PARAMS, encodeParams } from './params';

const fig = { nodes: [{ c: 0, r: 0 }, { c: 1, r: 0 }], edges: [[0, 1]] as [number, number][] };

describe('drawHash', () => {
  it('keeps a drawing beside the settings and reads it back', () => {
    const hash = withDrawing(encodeParams({ ...DEFAULT_PARAMS, size: 9 }), 'draw', fig);
    expect(readDrawing('#' + hash)).toEqual({ source: 'draw', figure: fig });
    expect(decodeParams('#' + hash).size).toBe(9);
  });
  it('leaves the hash alone while generating, and reads a hash without a drawing as generating', () => {
    expect(withDrawing('size=9', 'generate', fig)).toBe('size=9');
    expect(readDrawing('#size=9').source).toBe('generate');
    expect(readDrawing('#sky=junk').source).toBe('generate');
  });
});
