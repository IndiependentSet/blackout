import type { Dispatch } from 'react';
import type { Recipe } from '../../domain/generation';
import type { Resource } from '../../hooks/useResource';
import { Button } from '../../themes/stargazer/kit/Button';
import { Num, Row } from '../Playground/controls';
import { ParamsPanel } from '../Playground/ParamsPanel';
import { toGenOptions } from '../Playground/params';
import { RecipeBar } from '../Recipes/RecipeBar';
import { ConstraintsSection } from './ConstraintsSection';
import { tabConstraints, tabParams, type EditorAction, type EditorState } from './editor';
import pg from '../Playground/Playground.module.css';
import styles from './GenerationConfig.module.css';

/** The draft schedule, one rule at a time: retries, a tab per site plus the
    fallback, the recipe it matches, and the playground's knobs for the open one. */
export function SchedulePanel({ state, dispatch, recipes }: { state: EditorState; dispatch: Dispatch<EditorAction>; recipes: Resource<Recipe[]> }) {
  const { schedule, tab } = state;
  const site = tab === 'fallback' ? null : schedule.sites[tab];
  const params = tabParams(state);
  return (
    <div className={styles.left}>
      <div className={pg.panel}>
        <section>
          <h3>Schedule</h3>
          <Row label="Retries" help="retries">
            <Num v={schedule.retries} min={1} max={20} on={value => dispatch({ type: 'retries', value })} />
          </Row>
          <div className={styles.tabs} role="tablist" aria-label="schedule rules">
            {schedule.sites.map((s, i) => (
              <Button key={i} size="xs" role="tab" aria-selected={tab === i} kind={tab === i ? 'primary' : 'soft'}
                title={`Sky ${i + 1}: ${s.size} nodes, ${'★'.repeat(s.diff)}`} onClick={() => dispatch({ type: 'tab', tab: i })}>
                Sky {i + 1}
              </Button>
            ))}
            <Button size="xs" role="tab" aria-selected={tab === 'fallback'} kind={tab === 'fallback' ? 'primary' : 'outline'}
              onClick={() => dispatch({ type: 'tab', tab: 'fallback' })}>Fallback</Button>
          </div>
          <div className={styles.basis}>{site ? `Sky ${(tab as number) + 1} of ${schedule.sites.length}` : 'Fallback: any sky whose retries all fail'}</div>
        </section>
      </div>
      <RecipeBar key={String(tab)} options={toGenOptions(params)} recipes={recipes}
        range={typeof tab === 'number' ? { unit: 'sky', index: tab, count: schedule.sites.length } : null}
        onApply={(shape, range) => dispatch(range ? { type: 'shape', shape, from: range.from, to: range.to } : { type: 'params', action: { type: 'shape', shape } })} />
      <ParamsPanel p={params} dispatch={action => dispatch({ type: 'params', action })} use={site ? 'site' : 'fallback'}>
        {site && <ConstraintsSection c={tabConstraints(state)} onChange={patch => dispatch({ type: 'constraints', patch })} />}
      </ParamsPanel>
    </div>
  );
}
