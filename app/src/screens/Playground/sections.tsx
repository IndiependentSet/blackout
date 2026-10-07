/* The parts of the settings panel that depend on the strategy, plus the
   hardness filters both strategies share. */
import type { Dispatch } from 'react';
import { GADGET_NAMES, OPTION_LIMITS as L } from '../../domain/generation';
import { Check, Num, Range, Row } from './controls';
import { Info } from './Info';
import { weightsFor, type ParamsAction, type PlaygroundParams } from './params';
import styles from './Playground.module.css';

interface SectionProps { p: PlaygroundParams; set: (patch: Partial<PlaygroundParams>) => void }

const bias = (b: number) => (b === 0 ? 'any' : b < 0 ? `short ${(-b).toFixed(1)}` : `long ${b.toFixed(1)}`);

/** Free strategy: how the junctions are laid out and wired. */
export function FreeSection({ p, set }: SectionProps) {
  return (
    <section>
      <h3>Free layout</h3>
      <Row label="Density" help="density" value={p.density.toFixed(1)}>
        <Range v={p.density} {...L.density} on={density => set({ density })} />
      </Row>
      <Row label="Spread" help="spread" value={'×' + p.spread.toFixed(2)}>
        <Range v={p.spread} {...L.spread} on={spread => set({ spread })} />
      </Row>
      <Row label="Edge length" help="lengthBias" value={bias(p.lengthBias)}>
        <Range v={p.lengthBias} {...L.lengthBias} on={lengthBias => set({ lengthBias })} />
      </Row>
    </section>
  );
}

/** Gadget strategy: the extra-edge pass and the gadget mix. */
export function GadgetSection({ p, set, dispatch }: SectionProps & { dispatch: Dispatch<ParamsAction> }) {
  const weights = p.weights ?? weightsFor(p.diff);
  return (
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
  );
}

/** What makes a level acceptable beyond its size: how many optima, and how much thinking it needs. */
export function HardnessSection({ p, set }: SectionProps) {
  return (
    <section>
      <h3>Hardness</h3>
      <Row label="Max optimal covers" help="maxOptima" value={p.maxOptima === 0 ? 'any' : p.maxOptima === 1 ? 'unique' : '≤ ' + p.maxOptima}>
        <Num v={p.maxOptima} {...L.maxOptima} on={maxOptima => set({ maxOptima })} />
      </Row>
      <Row label="Greedy must fail" help="greedyMustFail">
        <Check v={p.greedyMustFail} on={greedyMustFail => set({ greedyMustFail })} />
      </Row>
      <Row label="Min bound gap" help="minBoundGap" value={p.minBoundGap === 0 ? 'off' : '≥ ' + p.minBoundGap}>
        <Range v={p.minBoundGap} {...L.minBoundGap} on={minBoundGap => set({ minBoundGap })} />
      </Row>
    </section>
  );
}
