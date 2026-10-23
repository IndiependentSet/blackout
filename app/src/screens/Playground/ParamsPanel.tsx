import type { Dispatch, ReactNode } from 'react';
import { DEFAULT_SCHEDULE, OPTION_LIMITS as L, STRATEGIES, type Strategy } from '../../domain/generation';
import { Button } from '../../themes/stargazer/kit/Button';
import { Check, Num, Range, Row, Select } from './controls';
import { Info } from './Info';
import type { ParamsAction, PlaygroundParams } from './params';
import { FreeSection, GadgetSection, HardnessSection } from './sections';
import styles from './Playground.module.css';

const REACH = [{ v: 1, label: '1 · orthogonal' }, { v: 1.5, label: '1.5 · + diagonals' },
  { v: 2.3, label: '2.3 · + knight moves' }, { v: 3.2, label: '3.2 · long' }];

/** What the panel edits: the playground's free settings; one rule of a
    generation schedule or pool curve, where the day or the slot picks the seed
    (and the fallback runs at each rule's own size); or a recipe, which is only a
    shape (its seed, size and difficulty just pick the preview). */
export type PanelUse = 'playground' | 'site' | 'fallback' | 'recipe';

/** Every knob the generator exposes, grouped the way they interact. */
export function ParamsPanel({ p, dispatch, onReroll, use = 'playground', children }: {
  p: PlaygroundParams; dispatch: Dispatch<ParamsAction>; onReroll?: () => void; use?: PanelUse;
  /** extra sections, shown under Graph */
  children?: ReactNode;
}) {
  const set = (patch: Partial<PlaygroundParams>) => dispatch({ type: 'set', patch });
  const free = use === 'playground';
  const recipe = use === 'recipe';

  return (
    <div className={styles.panel}>
      {free && <section>
        <h3>Presets <Info k="presets" /></h3>
        <div className={styles.chips}>
          {DEFAULT_SCHEDULE.sites.map((s, i) => (
            <Button key={i} size="xs" kind="soft" title={`${s.size} nodes, difficulty ${s.diff}`}
              onClick={() => dispatch({ type: 'site', idx: i })}>Sky {i + 1}</Button>
          ))}
          <Button size="xs" kind="outline" onClick={() => dispatch({ type: 'reset' })}>Reset</Button>
        </div>
      </section>}

      <section>
        <h3>Graph</h3>
        {recipe && <p className={styles.muted}>Seed, nodes and difficulty only pick the preview: a recipe is the shape below.</p>}
        {(free || recipe) && <Row label="Seed" help="seed">
          <Num v={p.seed} min={0} on={seed => set({ seed })} />
          {onReroll && <Button size="xs" onClick={onReroll} title="random seed (r)">🎲</Button>}
        </Row>}
        <Row label="Strategy" help="strategy">
          <Select v={p.strategy} on={v => set({ strategy: v as Strategy })}>
            {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Row>
        {use !== 'fallback' && <Row label="Nodes" help="size" value={p.size}><Range v={p.size} {...L.size} on={size => set({ size })} /></Row>}
        <Row label="Difficulty" help="diff" value={'★'.repeat(p.diff)}>
          <Range v={p.diff} {...L.diff} on={diff => set({ diff })} />
        </Row>
        {!recipe && <Row label="Stars must match" help="matchStars">
          <Check v={p.matchStars} on={matchStars => set({ matchStars })} />
        </Row>}
      </section>
      {children}

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
        <Row label="Shortest cycle" help="girth" value={p.girth === 3 ? 'any' : p.girth}>
          <Range v={p.girth} {...L.girth} on={girth => set({ girth })} />
        </Row>
      </section>

      {p.strategy === 'free' ? <FreeSection p={p} set={set} /> : <GadgetSection p={p} set={set} dispatch={dispatch} />}
      {!recipe && <HardnessSection p={p} set={set} />}

      {!recipe && <section>
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
      </section>}
    </div>
  );
}
