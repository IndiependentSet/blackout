import type { Dispatch } from 'react';
import { checkFigure } from '../../domain/generation';
import type { SkyFigure } from '../../domain/types';
import { Button } from '../../themes/stargazer/kit/Button';
import { cx } from '../../themes/stargazer/kit/cx';
import { Figure } from '../../themes/stargazer/kit/Figure';
import { FigureStatus } from '../SkyEditor/FigureStatus';
import { SkyEditor } from '../SkyEditor/SkyEditor';
import { useFigureCheck } from '../SkyEditor/useFigureCheck';
import type { PoolEditor, PoolEditorAction } from './poolEditor';
import pg from '../Playground/Playground.module.css';
import styles from './LevelPools.module.css';

/** A hand-drawn tier's drawings, one per level: pick one to edit it, add or remove one. */
export function DrawingList({ figures, open, dispatch }: { figures: readonly SkyFigure[]; open: number; dispatch: Dispatch<PoolEditorAction> }) {
  return (
    <div className={pg.panel}>
      <section>
        <h3>Hand-drawn skies</h3>
        <div className={styles.basis}>One level per drawing, in this order. Each needs exactly one best answer.</div>
        <div className={styles.drawings} role="group" aria-label="drawings">
          {figures.map((f, i) => {
            const ok = checkFigure(f).playable;
            return (
              <button key={i} type="button" className={cx(styles.drawing, i === open && styles.cellOpen, !ok && styles.bad)}
                aria-pressed={i === open} aria-label={`drawing ${i + 1}${ok ? '' : ', not playable yet'}`} onClick={() => dispatch({ type: 'openDrawing', index: i })}>
                {f.nodes.length ? <Figure figure={f} mode="atlas" className={styles.thumb} /> : <span className={styles.thumbEmpty}>empty</span>}
                <span>{i + 1}</span>
              </button>
            );
          })}
        </div>
        <div className={styles.actions}>
          <Button size="xs" kind="outline" onClick={() => dispatch({ type: 'addDrawing' })}>+ Add a sky</Button>
          <Button size="xs" kind="ghost" disabled={figures.length <= 1} onClick={() => dispatch({ type: 'removeDrawing', index: open })}>Remove this one</Button>
        </div>
      </section>
    </div>
  );
}

/** The open drawing of a hand-drawn tier, in the sky editor. */
export function TierDrawing({ state, dispatch, startFrom }: {
  state: PoolEditor; dispatch: Dispatch<PoolEditorAction>;
  /** the level this slot was last built with, to start the drawing from */
  startFrom: SkyFigure | null;
}) {
  const tier = typeof state.tab === 'number' ? state.curve.tiers[state.tab] : undefined;
  const figure = tier?.manual?.[state.drawing];
  const check = useFigureCheck(figure ?? { nodes: [], edges: [] });
  if (!figure) return null;
  return (
    <div className={pg.panel}>
      <section>
        <h3>Tier {(state.tab as number) + 1} · sky {state.drawing + 1} of {tier?.manual?.length}</h3>
        <SkyEditor key={`${state.tab}:${state.drawing}`} figure={figure} check={check} startFrom={startFrom} startLabel="Start from the built level"
          onChange={f => dispatch({ type: 'setDrawing', index: state.drawing, figure: f })} />
        <FigureStatus check={check} />
      </section>
    </div>
  );
}
