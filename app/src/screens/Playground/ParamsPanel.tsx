import type { Dispatch } from 'react';
import { DEFAULT_SCHEDULE, GADGET_NAMES, OPTION_LIMITS as L } from '../../domain/generation';
import { Button } from '../../ui';
import { Check, Num, Range, Row, Select } from './controls';
import { Info } from './Info';
import { weightsFor, type ParamsAction, type PlaygroundParams } from './params';
import styles from './Playground.module.css';

const REACH = [{ v: 1, label: '1 · orthogonal' }, { v: 1.5, label: '1.5 · + diagonals' },
  { v: 2.3, label: '2.3 · + knight moves' }, { v: 3.2, label: '3.2 · long' }];

/** Every knob the generator exposes, grouped the way they interact. */
export function ParamsPanel({ p, dispatch, onReroll }: {
  p: PlaygroundParams; dispatch: Dispatch<ParamsAction>; onReroll: () => void;
}) {
  const set = (patch: Partial<PlaygroundParams>) => dispatch({ type: 'set', patch });
  const weights = p.weights ?? weightsFor(p.diff);

  return (
    <div className={styles.panel}>
      <section>
        <h3>Presets <Info k="presets" /></h3>
        <div className={styles.chips}>
          {DEFAULT_SCHEDULE.sites.map((s, i) => (
            <Button key={i} size="mini" variant="secondary" title={`${s.size} nodes, difficulty ${s.diff}`}
              onClick={() => dispatch({ type: 'site', idx: i })}>Site {i + 1}</Button>
          ))}
          <Button size="mini" variant="muted" onClick={() => dispatch({ type: 'reset' })}>Reset</Button>
        </div>
      </section>

      <section>
        <h3>Graph</h3>
        <Row label="Seed" help="seed">
          <Num v={p.seed} min={0} on={seed => set({ seed })} />
          <Button size="mini" onClick={onReroll} title="random seed (r)">🎲</Button>
        </Row>
        <Row label="Nodes" help="size" value={p.size}><Range v={p.size} {...L.size} on={size => set({ size })} /></Row>
        <Row label="Difficulty" help="diff" value={'★'.repeat(p.diff)}>
          <Range v={p.diff} {...L.diff} on={diff => set({ diff })} />
        </Row>
        <Row label="Stars must match" help="matchStars">
          <Check v={p.matchStars} on={matchStars => set({ matchStars })} />
        </Row>
        <Row label="Unique optimum" help="unique">
          <Check v={p.unique} on={unique => set({ unique })} />
        </Row>
      </section>

      <section>
        <h3>Degree</h3>
        <Row label="Min degree" help="minDegree" value={p.minDegree < 2 ? 'any' : p.minDegree}>
          <Range v={p.minDegree} {...L.minDegree} on={minDegree => set({ minDegree, maxDegree: Math.max(p.maxDegree, minDegree) })} />
        </Row>
        <Row label="Max degree" help="maxDegree" value={p.maxDegree}>
          <Range v={p.maxDegree} {...L.maxDegree} on={maxDegree => set({ maxDegree, minDegree: Math.min(p.minDegree, maxDegree) })} />
        </Row>
      </section>

      <section>
        <h3>Geometry</h3>
        <Row label="Edge reach" help="reach">
          <Select v={p.reach} on={v => set({ reach: Number(v) })}>
            {REACH.map(r => <option key={r.v} value={r.v}>{r.label}</option>)}
          </Select>
        </Row>
        <Row label="Clearance" help="clearance" value={p.clearance.toFixed(2)}>
          <Range v={p.clearance} {...L.clearance} on={clearance => set({ clearance })} />
        </Row>
        <Row label="Allow crossings" help="crossings">
          <Check v={p.crossings} on={crossings => set({ crossings })} />
        </Row>
      </section>

      <section>
        <h3>Shape</h3>
        <Row label="Extra edges" help="extraEdges" value={p.extraEdges === null ? 'auto' : '×' + p.extraEdges.toFixed(1)}>
          <Check v={p.extraEdges === null} on={auto => set({ extraEdges: auto ? null : (p.diff === 3 ? 0.8 : 0) })} />
          {p.extraEdges !== null && <Range v={p.extraEdges} {...L.extraEdges} on={extraEdges => set({ extraEdges })} />}
        </Row>
        <Row label="Custom gadget mix" help="weights">
          <Check v={p.weights !== null} on={on => set({ weights: on ? weightsFor(p.diff) : null })} />
        </Row>
        <div className={styles.gadgets}>
          {GADGET_NAMES.map(n => (
            <div key={n} className={p.weights ? undefined : styles.off}>
              <span>{n}<Info k={`gadget.${n}`} /></span>
              <Num v={weights[n]} {...L.gadgetWeight} label={`${n} weight`} on={value => dispatch({ type: 'weight', gadget: n, value })} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3>Search</h3>
        <Row label="Attempts" help="attempts"><Num v={p.attempts} {...L.attempts} on={attempts => set({ attempts })} /></Row>
        <Row label="Repairs / attempt" help="repairs"><Num v={p.repairs} {...L.repairs} on={repairs => set({ repairs })} /></Row>
        <Row label="Solver cap" help="solverCap">
          <Num v={p.solverCap} {...L.solverCap} on={solverCap => set({ solverCap })} />
        </Row>
        <Row label="Time budget" help="clock">
          <Check v={p.clock} on={clock => set({ clock })} />
          {p.clock ? <Num v={p.budgetMs} {...L.budgetMs} on={budgetMs => set({ budgetMs })} />
            : <span className={styles.muted}>off</span>}
        </Row>
      </section>
    </div>
  );
}
