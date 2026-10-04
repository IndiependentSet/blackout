import type { Dispatch, ReactNode } from 'react';
import { GADGET_NAMES, RAMP } from '../../domain/engine';
import { Button } from '../../ui';
import { weightsFor, type ParamsAction, type PlaygroundParams } from './params';
import styles from './Playground.module.css';

const REACH = [{ v: 1, label: '1 · orthogonal' }, { v: 1.5, label: '1.5 · + diagonals' },
  { v: 2.3, label: '2.3 · + knight moves' }, { v: 3.2, label: '3.2 · long' }];

function Row({ label, value, children, title }: { label: string; value?: ReactNode; children: ReactNode; title?: string }) {
  return (
    <label className={styles.row} title={title}>
      <span className={styles.rowLabel}>{label}</span>
      {children}
      {value !== undefined && <span className={styles.rowValue}>{value}</span>}
    </label>
  );
}

function Range({ v, min, max, step = 1, on }: { v: number; min: number; max: number; step?: number; on: (v: number) => void }) {
  return <input type="range" min={min} max={max} step={step} value={v} onChange={e => on(Number(e.target.value))} />;
}

function Num({ v, min, max, step = 1, on }: { v: number; min: number; max?: number; step?: number; on: (v: number) => void }) {
  return <input className={styles.num} type="number" min={min} max={max} step={step} value={v}
    onChange={e => { const n = Number(e.target.value); if (Number.isFinite(n)) on(n); }} />;
}

function Check({ v, on }: { v: boolean; on: (v: boolean) => void }) {
  return <input type="checkbox" checked={v} onChange={e => on(e.target.checked)} />;
}

/** Every knob the generator exposes, grouped the way they interact. */
export function ParamsPanel({ p, dispatch, onReroll }: {
  p: PlaygroundParams; dispatch: Dispatch<ParamsAction>; onReroll: () => void;
}) {
  const set = (patch: Partial<PlaygroundParams>) => dispatch({ type: 'set', patch });
  const weights = p.weights ?? weightsFor(p.diff);

  return (
    <div className={styles.panel}>
      <section>
        <h3>Presets</h3>
        <div className={styles.chips}>
          {RAMP.map((s, i) => (
            <Button key={i} size="mini" variant="secondary" title={`${s.n} nodes, difficulty ${s.d}`}
              onClick={() => dispatch({ type: 'site', idx: i })}>Site {i + 1}</Button>
          ))}
          <Button size="mini" variant="muted" onClick={() => dispatch({ type: 'reset' })}>Reset</Button>
        </div>
      </section>

      <section>
        <h3>Graph</h3>
        <Row label="Seed">
          <Num v={p.seed} min={0} on={seed => set({ seed })} />
          <Button size="mini" onClick={onReroll} title="random seed (r)">🎲</Button>
        </Row>
        <Row label="Nodes" value={p.size}><Range v={p.size} min={4} max={80} on={size => set({ size })} /></Row>
        <Row label="Difficulty" value={'★'.repeat(p.diff)}
          title="Picks the default gadget menu, the extra-edge pass and the star target">
          <Range v={p.diff} min={1} max={3} on={diff => set({ diff })} />
        </Row>
        <Row label="Stars must match" title="Reject levels whose solving technique differs from the difficulty">
          <Check v={p.matchStars} on={matchStars => set({ matchStars })} />
        </Row>
        <Row label="Unique optimum" title="Require exactly one minimum cover (the game always does)">
          <Check v={p.unique} on={unique => set({ unique })} />
        </Row>
      </section>

      <section>
        <h3>Degree</h3>
        <Row label="Min degree" value={p.minDegree < 2 ? 'any' : p.minDegree}
          title="Below 2 there is no constraint. 2+ forbids leaves, so ties are broken with edges, not spurs">
          <Range v={p.minDegree} min={0} max={6} on={minDegree => set({ minDegree, maxDegree: Math.max(p.maxDegree, minDegree) })} />
        </Row>
        <Row label="Max degree" value={p.maxDegree}>
          <Range v={p.maxDegree} min={1} max={8} on={maxDegree => set({ maxDegree, minDegree: Math.min(p.minDegree, maxDegree) })} />
        </Row>
      </section>

      <section>
        <h3>Geometry</h3>
        <Row label="Edge reach" title="Longest edge, in lattice steps. Gadgets attach orthogonally; reach matters for the extra edges">
          <select value={p.reach} onChange={e => set({ reach: Number(e.target.value) })}>
            {REACH.map(r => <option key={r.v} value={r.v}>{r.label}</option>)}
          </select>
        </Row>
        <Row label="Clearance" value={p.clearance.toFixed(2)} title="How close an edge may pass to a node it doesn't join">
          <Range v={p.clearance} min={0} max={0.7} step={0.05} on={clearance => set({ clearance })} />
        </Row>
        <Row label="Allow crossings" title="Planar drawing off: edges may cross each other">
          <Check v={p.crossings} on={crossings => set({ crossings })} />
        </Row>
      </section>

      <section>
        <h3>Shape</h3>
        <Row label="Extra edges" value={p.extraEdges === null ? 'auto' : '×' + p.extraEdges.toFixed(1)}
          title="Rounds of 'close two nearby open nodes', as a multiple of the node count. Auto = 0.8 at ★★★, else none">
          <Check v={p.extraEdges === null} on={auto => set({ extraEdges: auto ? null : (p.diff === 3 ? 0.8 : 0) })} />
          {p.extraEdges === null && <span className={styles.muted}>auto</span>}
          {p.extraEdges !== null && <Range v={p.extraEdges} min={0} max={3} step={0.1} on={extraEdges => set({ extraEdges })} />}
        </Row>
        <Row label="Custom gadget mix" title="Off: the difficulty's own menu. Weights are relative">
          <Check v={p.weights !== null} on={on => set({ weights: on ? weightsFor(p.diff) : null })} />
        </Row>
        <div className={styles.gadgets}>
          {GADGET_NAMES.map(n => (
            <label key={n} className={p.weights ? undefined : styles.off}>
              <span>{n}</span>
              <Num v={weights[n]} min={0} max={9} on={value => dispatch({ type: 'weight', gadget: n, value })} />
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3>Search</h3>
        <Row label="Attempts"><Num v={p.attempts} min={1} on={attempts => set({ attempts })} /></Row>
        <Row label="Repairs / attempt"><Num v={p.repairs} min={0} on={repairs => set({ repairs })} /></Row>
        <Row label="Solver cap" title="Branch-and-bound visits before a graph is abandoned">
          <Num v={p.solverCap} min={1000} step={50000} on={solverCap => set({ solverCap })} />
        </Row>
        <Row label="Time budget" title="Off = attempt-limited, so the seed alone decides the graph">
          <Check v={p.clock} on={clock => set({ clock })} />
          {p.clock ? <Num v={p.budgetMs} min={10} step={100} on={budgetMs => set({ budgetMs })} />
            : <span className={styles.muted}>off · seed-reproducible</span>}
        </Row>
      </section>
    </div>
  );
}
