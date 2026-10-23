import type { Dispatch } from 'react';
import type { Recipe } from '../../domain/generation';
import type { SkyFigure } from '../../domain/types';
import type { Resource } from '../../hooks/useResource';
import { Button } from '../../themes/stargazer/kit/Button';
import { ConstraintsSection } from '../GenerationConfig/ConstraintsSection';
import { Num, Row } from '../Playground/controls';
import { Info } from '../Playground/Info';
import { ParamsPanel } from '../Playground/ParamsPanel';
import { ScopeSwitch } from '../Playground/ScopeSwitch';
import { toGenOptions } from '../Playground/params';
import { RecipeBar } from '../Recipes/RecipeBar';
import { MAX_TIER_COUNT, openTier, poolParams, tierLevels, tierSource, type PoolEditor, type PoolEditorAction } from './poolEditor';
import { DrawingList } from './TierDrawings';
import pg from '../Playground/Playground.module.css';
import styles from './LevelPools.module.css';

/** The open rule of the curve, with every generator setting: a tier (its levels, the recipe it matches, the full
    settings panel and its constraints) or the fallback. */
const levelsText = (mode: PoolEditor['mode'], l: { first: number; last: number }) =>
  `${mode === 'campaign' ? 'level' : 'slot'}${l.last > l.first ? 's' : ''} ${l.first}${l.last > l.first ? `–${l.last}` : ''}`;

export function TierPanel({ state, dispatch, recipes, built }: {
  state: PoolEditor; dispatch: Dispatch<PoolEditorAction>; recipes: Resource<Recipe[]>;
  /** the open tier's levels from the last build, as drawings: what switching it to hand-drawn starts from */
  built: SkyFigure[];
}) {
  const tier = openTier(state);
  const i = typeof state.tab === 'number' ? state.tab : -1;
  const count = state.curve.tiers.length;
  const params = poolParams(state);
  const levels = tier ? tierLevels(state, i) : null;
  const source = tierSource(state);
  const toGenerated = () => {
    const drawn = tier?.manual?.some(f => f.nodes.length) ?? false;
    if (!drawn || window.confirm('Go back to generating this tier? Its hand-drawn skies will be dropped.')) {
      dispatch({ type: 'tierSource', source: 'generate' });
    }
  };

  return (
    <div className={styles.left}>
      <div className={pg.panel}>
        <section>
          <h3>{tier ? <>Tier {i + 1} of {count}</> : 'Fallback'} <Info k={tier ? 'tier' : 'fallback'} /></h3>
          {tier && levels && <div className={styles.basis}>
            {state.mode === 'campaign' ? 'Levels' : 'Slots'} {levels.first}{levels.last > levels.first ? `–${levels.last}` : ''}
          </div>}
          {!tier && <div className={styles.basis}>Any tier whose retries all fail, at that tier’s own size</div>}
          <div className={styles.actions}>
            <Button size="xs" kind="soft" disabled={i <= 0} aria-label="previous tier" onClick={() => dispatch({ type: 'tab', tab: i - 1 })}>‹ Prev</Button>
            <Button size="xs" kind="soft" disabled={!tier || i >= count - 1} aria-label="next tier" onClick={() => dispatch({ type: 'tab', tab: i + 1 })}>Next ›</Button>
            {tier && <>
              <Button size="xs" kind="outline" onClick={() => dispatch({ type: 'addTier' })}>Duplicate</Button>
              <Button size="xs" kind="outline" disabled={count === 1} onClick={() => dispatch({ type: 'removeTier' })}>Remove</Button>
            </>}
          </div>
          {tier && <div className={styles.actions} role="group" aria-label="where this tier's skies come from">
            <Button size="xs" kind={source === 'generate' ? 'primary' : 'soft'} aria-pressed={source === 'generate'} onClick={toGenerated}>Generate</Button>
            <Button size="xs" kind={source === 'draw' ? 'primary' : 'soft'} aria-pressed={source === 'draw'}
              title={built.length ? 'starts from the levels this tier was last built with' : undefined}
              onClick={() => dispatch({ type: 'tierSource', source: 'draw', figures: built })}>Draw by hand</Button>
          </div>}
          {tier && source === 'generate' && <Row label="Levels" help="tierCount">
            <Num v={tier.count} min={1} max={MAX_TIER_COUNT} on={value => dispatch({ type: 'count', value })} />
          </Row>}
        </section>
      </div>
      {tier?.manual ? <DrawingList figures={tier.manual} open={state.drawing} dispatch={dispatch} /> : <>
      <RecipeBar key={String(state.tab)} options={toGenOptions(params)} recipes={recipes}
        range={tier ? { unit: 'tier', index: i, count } : null}
        onApply={(shape, range) => dispatch(range ? { type: 'shape', shape, from: range.from, to: range.to } : { type: 'params', action: { type: 'shape', shape } })} />
      <ParamsPanel p={params} dispatch={action => dispatch({ type: 'params', action })} use={tier ? 'site' : 'fallback'}
        banner={tier && levels && count > 1 && <ScopeSwitch scope={state.scope} onScope={scope => dispatch({ type: 'scope', scope })}
          one={`Tier ${i + 1} · ${levelsText(state.mode, levels)}`} all={`All ${count} tiers`} />}>
        {tier && <ConstraintsSection c={tier.constraints ?? {}} onChange={patch => dispatch({ type: 'constraints', patch })} />}
      </ParamsPanel>
      </>}
    </div>
  );
}
