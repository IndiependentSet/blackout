import type { Dispatch } from 'react';
import { SITES } from '../../domain/sites';
import { Button } from '../../ui';
import { Num, Row } from '../Playground/controls';
import { ParamsPanel } from '../Playground/ParamsPanel';
import { ConstraintsSection } from './ConstraintsSection';
import { tabConstraints, tabParams, type EditorAction, type EditorState } from './editor';
import pg from '../Playground/Playground.module.css';
import styles from './GenerationConfig.module.css';

/** The draft schedule, one rule at a time: retries, a tab per site plus the
    fallback, and the playground's knobs for the open one. */
export function SchedulePanel({ state, dispatch }: { state: EditorState; dispatch: Dispatch<EditorAction> }) {
  const { schedule, tab } = state;
  const site = tab === 'fallback' ? null : schedule.sites[tab];
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
              <Button key={i} size="mini" role="tab" aria-selected={tab === i} variant={tab === i ? 'primary' : 'secondary'}
                title={`${SITES[i]}: ${s.size} nodes, ${'★'.repeat(s.diff)}`} onClick={() => dispatch({ type: 'tab', tab: i })}>
                Site {i + 1}
              </Button>
            ))}
            <Button size="mini" role="tab" aria-selected={tab === 'fallback'} variant={tab === 'fallback' ? 'primary' : 'muted'}
              onClick={() => dispatch({ type: 'tab', tab: 'fallback' })}>Fallback</Button>
          </div>
          <div className={styles.basis}>{site ? `Site ${(tab as number) + 1} · ${SITES[tab as number]}` : 'Fallback: any site whose retries all fail'}</div>
        </section>
      </div>
      <ParamsPanel p={tabParams(state)} dispatch={action => dispatch({ type: 'params', action })} use={site ? 'site' : 'fallback'}>
        {site && <ConstraintsSection c={tabConstraints(state)} onChange={patch => dispatch({ type: 'constraints', patch })} />}
      </ParamsPanel>
    </div>
  );
}
