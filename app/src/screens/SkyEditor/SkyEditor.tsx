import { useMemo, useRef, useState, type PointerEvent } from 'react';
import type { FigureCheck } from '../../domain/generation';
import { crossingPairs } from '../../domain/graphStats';
import type { Cell, SkyFigure } from '../../domain/types';
import { useWindowKey } from '../../hooks/useWindowKey';
import { Button } from '../../themes/stargazer/kit/Button';
import { cx } from '../../themes/stargazer/kit/cx';
import { editStep, gridBounds, hitTest, initialUi, TOOLS, type EditorAction, type EditorUi, type Tool } from './skyEditor';
import styles from './SkyEditor.module.css';

const U = 48;   // px per lattice step
const TOOL_LABEL: Record<Tool, string> = { draw: '✦ Draw', move: '✥ Move', erase: '⌫ Erase' };
const TOOL_HELP: Record<Tool, string> = {
  draw: 'tap a cell for a star (joined to the last one); tap two stars to join or unjoin them',
  move: 'drag a star to another cell',
  erase: 'tap a star or a line to take it away',
};

/** Draw a sky by hand: stars on lattice cells, lines between them. The drawing is the page's (`figure` in,
    `onChange` out); the editor keeps its tool, the line being drawn and undo. Remount it (`key`) to start a
    fresh undo history, e.g. when another drawing is opened. */
export function SkyEditor({ figure, onChange, check, showAnswer = false, startFrom, startLabel = 'Start from current sky' }: {
  figure: SkyFigure;
  onChange: (figure: SkyFigure) => void;
  /** what the drawing comes to (useFigureCheck), for the answer and the alarms */
  check: FigureCheck;
  showAnswer?: boolean;
  /** a sky the drawing can be started from (the last generated or previewed one) */
  startFrom?: SkyFigure | null;
  startLabel?: string;
}) {
  const [ui, setUi] = useState<EditorUi>(initialUi);
  const [drag, setDrag] = useState<{ star: number; cell: Cell } | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  const act = (a: EditorAction) => {
    const step = editStep(figure, ui, a);
    setUi(step.ui);
    if (step.figure !== figure) onChange(step.figure);
  };

  useWindowKey(e => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
    const tool = TOOLS[Number(e.key) - 1];
    if (tool) act({ type: 'tool', tool });
    else if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); act({ type: 'undo' }); }
    else if (e.key === 'Escape') act({ type: 'cancel' });
  });

  const box = useMemo(() => gridBounds(figure), [figure]);
  const crossed = useMemo(() => new Set(crossingPairs(figure).flat()), [figure]);
  const answer = useMemo(() => new Set(showAnswer && check.level ? check.level.sol : []), [showAnswer, check.level]);

  /* client → lattice units, through the SVG's own transform */
  const toLattice = (e: PointerEvent<SVGSVGElement>): { x: number; y: number } | null => {
    const el = svg.current, m = el?.getScreenCTM();
    if (!el || !m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: p.x / U, y: p.y / U };
  };
  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    const p = toLattice(e);
    if (!p) return;
    const hit = hitTest(figure, p);
    if (ui.tool === 'move') {
      if (hit.kind === 'star') { e.currentTarget.setPointerCapture?.(e.pointerId); setDrag({ star: hit.star, cell: figure.nodes[hit.star] }); }
      return;
    }
    if (hit.kind === 'star') act({ type: 'star', star: hit.star });
    else if (hit.kind === 'line') act({ type: 'line', line: hit.line });
    else act({ type: 'cell', cell: hit.cell });
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const p = drag && toLattice(e);
    if (drag && p) setDrag({ star: drag.star, cell: { c: Math.round(p.x), r: Math.round(p.y) } });
  };
  const onUp = () => {
    if (drag) act({ type: 'drop', star: drag.star, cell: drag.cell });
    setDrag(null);
  };

  const at = (i: number): Cell => (drag && drag.star === i ? drag.cell : figure.nodes[i]);
  const cells: Cell[] = [];
  for (let r = box.r0; r < box.r0 + box.h; r++) for (let c = box.c0; c < box.c0 + box.w; c++) cells.push({ c, r });

  return (
    <div className={styles.editor}>
      <div className={styles.tools} role="toolbar" aria-label="drawing tools">
        {TOOLS.map((t, i) => (
          <Button key={t} size="xs" kind={ui.tool === t ? 'primary' : 'soft'} title={`${TOOL_HELP[t]} (${i + 1})`}
            aria-pressed={ui.tool === t} onClick={() => act({ type: 'tool', tool: t })}>{TOOL_LABEL[t]}</Button>
        ))}
        <Button size="xs" kind="outline" disabled={!ui.past.length} title="undo (z)" onClick={() => act({ type: 'undo' })}>↶ Undo</Button>
        <Button size="xs" kind="ghost" disabled={!figure.nodes.length} onClick={() => act({ type: 'clear' })}>Clear</Button>
        {startFrom && startFrom.nodes.length > 0 && (
          <Button size="xs" kind="mint" onClick={() => { setUi(u => ({ ...u, pending: null, past: [...u.past, figure] })); onChange(startFrom); }}>
            {startLabel}
          </Button>
        )}
      </div>
      <p className={styles.help}>{TOOL_HELP[ui.tool]} · {figure.nodes.length} stars · {figure.edges.length} lines</p>
      <svg ref={svg} className={cx(styles.canvas, styles['tool-' + ui.tool])} role="application" aria-label="sky editor"
        viewBox={`${(box.c0 - 0.5) * U} ${(box.r0 - 0.5) * U} ${box.w * U} ${box.h * U}`}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => setDrag(null)}>
        {cells.map(p => <circle key={`${p.c},${p.r}`} cx={p.c * U} cy={p.r * U} r={2.5} className={styles.dot} />)}
        {figure.edges.map(([a, b], i) => {
          const A = at(a), B = at(b);
          if (!A || !B) return null;
          const lit = answer.has(a) || answer.has(b);
          return <line key={i} x1={A.c * U} y1={A.r * U} x2={B.c * U} y2={B.r * U}
            className={cx(styles.line, lit && styles.lineLit, crossed.has(i) && styles.crossed)} />;
        })}
        {figure.nodes.map((_, i) => {
          const p = at(i);
          return (
            <g key={i}>
              {ui.pending === i && <circle cx={p.c * U} cy={p.r * U} r={U * 0.42} className={styles.pending} />}
              <circle cx={p.c * U} cy={p.r * U} r={U * 0.26}
                className={cx(styles.star, answer.has(i) && styles.starLit, drag?.star === i && styles.dragging)} />
              <text x={p.c * U} y={p.r * U} className={cx(styles.label, answer.has(i) && styles.labelLit)}>{i}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
