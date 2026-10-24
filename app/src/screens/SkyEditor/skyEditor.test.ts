import { describe, expect, it } from 'vitest';
import type { SkyFigure } from '../../domain/types';
import { editStep, gridBounds, hitTest, initialUi, type EditorAction, type EditorStep } from './skyEditor';

const run = (actions: EditorAction[], start: EditorStep = { figure: { nodes: [], edges: [] }, ui: initialUi }) =>
  actions.reduce((s, a) => editStep(s.figure, s.ui, a), start);

describe('editStep', () => {
  it('draws a chain: each new star is joined to the one before', () => {
    const s = run([{ type: 'cell', cell: { c: 0, r: 0 } }, { type: 'cell', cell: { c: 1, r: 0 } }, { type: 'cell', cell: { c: 2, r: 0 } }]);
    expect(s.figure.nodes).toHaveLength(3);
    expect(s.figure.edges).toEqual([[0, 1], [1, 2]]);
    expect(s.ui.pending).toBe(2);
  });
  it('joins two stars, and a second tap on the same star stops the chain', () => {
    let s = run([{ type: 'cell', cell: { c: 0, r: 0 } }, { type: 'cancel' }, { type: 'cell', cell: { c: 2, r: 0 } }, { type: 'cancel' }]);
    expect(s.figure.edges).toEqual([]);
    s = run([{ type: 'star', star: 0 }, { type: 'star', star: 1 }], s);
    expect(s.figure.edges).toEqual([[0, 1]]);
    s = run([{ type: 'star', star: 1 }], s);
    expect(s.ui.pending).toBeNull();
  });
  it('erases stars and lines, and undoes every edit', () => {
    let s = run([{ type: 'cell', cell: { c: 0, r: 0 } }, { type: 'cell', cell: { c: 1, r: 0 } }, { type: 'cell', cell: { c: 2, r: 0 } }]);
    const full = s.figure;
    s = run([{ type: 'tool', tool: 'erase' }, { type: 'line', line: 0 }], s);
    expect(s.figure.edges).toEqual([[1, 2]]);
    s = run([{ type: 'star', star: 2 }], s);
    expect(s.figure.nodes).toHaveLength(2);
    s = run([{ type: 'undo' }, { type: 'undo' }], s);
    expect(s.figure).toBe(full);
  });
  it('moves a star only with the move tool, and only to a free cell', () => {
    let s = run([{ type: 'cell', cell: { c: 0, r: 0 } }, { type: 'cell', cell: { c: 1, r: 0 } }]);
    const before = s.figure;
    s = run([{ type: 'drop', star: 0, cell: { c: 4, r: 4 } }], s);
    expect(s.figure).toBe(before);
    s = run([{ type: 'tool', tool: 'move' }, { type: 'drop', star: 0, cell: { c: 1, r: 0 } }], s);
    expect(s.figure).toBe(before);
    s = run([{ type: 'drop', star: 0, cell: { c: 4, r: 4 } }], s);
    expect(s.figure.nodes[0]).toEqual({ c: 4, r: 4 });
  });
  it('leaves the drawing untouched when nothing was drawn', () => {
    const s = run([{ type: 'cell', cell: { c: 0, r: 0 } }]);
    const again = editStep(s.figure, s.ui, { type: 'cell', cell: { c: 0, r: 0 } });
    expect(again.figure).toBe(s.figure);
    expect(again.ui.past).toHaveLength(1);
  });
});

describe('hitTest', () => {
  const fig: SkyFigure = { nodes: [{ c: 0, r: 0 }, { c: 2, r: 0 }], edges: [[0, 1]] };
  it('finds a star, a line, or an empty cell', () => {
    expect(hitTest(fig, { x: 0.1, y: 0.1 })).toEqual({ kind: 'star', star: 0 });
    expect(hitTest(fig, { x: 1, y: 0.1 })).toEqual({ kind: 'line', line: 0 });
    expect(hitTest(fig, { x: 1, y: 1 })).toEqual({ kind: 'cell', cell: { c: 1, r: 1 } });
  });
});

describe('gridBounds', () => {
  it('keeps a starter board and grows around a drawing', () => {
    expect(gridBounds({ nodes: [], edges: [] })).toEqual({ c0: 0, r0: 0, w: 9, h: 7 });
    const b = gridBounds({ nodes: [{ c: 0, r: 0 }, { c: 12, r: 1 }], edges: [] });
    expect(b.c0).toBe(-2);
    expect(b.w).toBe(17);
    expect(b.h).toBe(7);
  });
});
