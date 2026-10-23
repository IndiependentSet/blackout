/* The hand-drawn sky editor's rules: what a tap on a cell, a star or a line does with each tool, and undo.
   The drawing itself belongs to the page (a pool tier, a Tonight day, the playground's hash); this only keeps
   the tool, the star a line is being drawn from, and the drawings to go back to. Pure. */
import { addStar, moveStar, removeLine, removeStar, starAt, toggleLine } from '../../domain/generation';
import type { Cell, SkyFigure } from '../../domain/types';

export type Tool = 'draw' | 'move' | 'erase';
export const TOOLS: readonly Tool[] = ['draw', 'move', 'erase'];

export interface EditorUi {
  tool: Tool;
  /** draw: the star the next line starts from */
  pending: number | null;
  /** earlier drawings, newest last */
  past: SkyFigure[];
}

export const initialUi: EditorUi = { tool: 'draw', pending: null, past: [] };

const MAX_UNDO = 100;

export type EditorAction =
  | { type: 'tool'; tool: Tool }
  /** a tap on an empty cell */
  | { type: 'cell'; cell: Cell }
  | { type: 'star'; star: number }
  | { type: 'line'; line: number }
  /** move: a star dropped on a cell */
  | { type: 'drop'; star: number; cell: Cell }
  | { type: 'cancel' }
  | { type: 'clear' }
  | { type: 'undo' };

export interface EditorStep { figure: SkyFigure; ui: EditorUi }

/** What an action does to the drawing and the editor. The drawing comes back unchanged (the same object) when
    nothing was drawn, so the page can tell an edit from a click that did nothing. */
export function editStep(figure: SkyFigure, ui: EditorUi, a: EditorAction): EditorStep {
  const edit = (next: SkyFigure, pending: number | null = ui.pending): EditorStep =>
    next === figure ? { figure, ui: { ...ui, pending } } : { figure: next, ui: { ...ui, pending, past: [...ui.past, figure].slice(-MAX_UNDO) } };
  switch (a.type) {
    case 'tool': return { figure, ui: { ...ui, tool: a.tool, pending: null } };
    case 'cancel': return { figure, ui: { ...ui, pending: null } };
    case 'clear': return figure.nodes.length ? edit({ nodes: [], edges: [] }, null) : { figure, ui };
    case 'undo': {
      const prev = ui.past[ui.past.length - 1];
      return prev ? { figure: prev, ui: { ...ui, pending: null, past: ui.past.slice(0, -1) } } : { figure, ui };
    }
    case 'cell': {
      if (ui.tool !== 'draw') return { figure, ui };
      const next = addStar(figure, a.cell);
      if (next === figure) return { figure, ui };
      /* drawing from a star: the new star is joined to it, and the line carries on from the new one */
      const added = next.nodes.length - 1;
      return edit(ui.pending === null ? next : toggleLine(next, ui.pending, added), added);
    }
    case 'star': {
      if (ui.tool === 'erase') return edit(removeStar(figure, a.star), null);
      if (ui.tool !== 'draw') return { figure, ui };
      if (ui.pending === null) return { figure, ui: { ...ui, pending: a.star } };
      if (ui.pending === a.star) return { figure, ui: { ...ui, pending: null } };
      return edit(toggleLine(figure, ui.pending, a.star), a.star);
    }
    case 'line': return ui.tool === 'erase' ? edit(removeLine(figure, a.line), null) : { figure, ui };
    case 'drop': return ui.tool === 'move' ? edit(moveStar(figure, a.star, a.cell)) : { figure, ui };
  }
}

/** What a tap at a lattice point hits: a star on that cell, else a line passing close, else the empty cell. */
export type Hit = { kind: 'star'; star: number } | { kind: 'line'; line: number } | { kind: 'cell'; cell: Cell };

/** `p` is in lattice units (fractions allowed); `reach` is how close to a line counts as on it. */
export function hitTest(figure: SkyFigure, p: { x: number; y: number }, reach = 0.22): Hit {
  const cell = { c: Math.round(p.x), r: Math.round(p.y) };
  const star = starAt(figure, cell);
  if (star >= 0 && Math.hypot(p.x - cell.c, p.y - cell.r) < 0.45) return { kind: 'star', star };
  let best = -1, bestD = reach;
  figure.edges.forEach(([a, b], i) => {
    const A = figure.nodes[a], B = figure.nodes[b];
    if (!A || !B) return;
    const dx = B.c - A.c, dy = B.r - A.r, len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p.x - A.c) * dx + (p.y - A.r) * dy) / len2));
    const d = Math.hypot(p.x - (A.c + t * dx), p.y - (A.r + t * dy));
    if (d < bestD) { bestD = d; best = i; }
  });
  if (best >= 0) return { kind: 'line', line: best };
  if (star >= 0) return { kind: 'star', star };
  return { kind: 'cell', cell };
}

/** The cells the editor shows: the drawing with room to grow on every side, never smaller than a starter board. */
export function gridBounds(figure: SkyFigure, margin = 2, min = { w: 9, h: 7 }): { c0: number; r0: number; w: number; h: number } {
  if (!figure.nodes.length) return { c0: 0, r0: 0, w: min.w, h: min.h };
  const cs = figure.nodes.map(p => p.c), rs = figure.nodes.map(p => p.r);
  let c0 = Math.min(...cs) - margin, r0 = Math.min(...rs) - margin;
  let w = Math.max(...cs) + margin - c0 + 1, h = Math.max(...rs) + margin - r0 + 1;
  if (w < min.w) { c0 -= Math.floor((min.w - w) / 2); w = min.w; }
  if (h < min.h) { r0 -= Math.floor((min.h - h) / 2); h = min.h; }
  return { c0, r0, w, h };
}
