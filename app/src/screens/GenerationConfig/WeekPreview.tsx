import { useMemo, useState } from 'react';
import { crossingPairs } from '../../domain/graphStats';
import type { SitePreview } from '../../services/generation/scheduleClient';
import { cx } from '../../ui';
import { Info } from '../Playground/Info';
import { playStatus } from '../Playground/play';
import { PlayBar } from '../Playground/PlayBar';
import { SchematicView } from '../Playground/SchematicView';
import { usePlacement } from '../Playground/usePlacement';
import type { Tab } from './editor';
import { SLOW_MS, siteSummary } from './week';
import pg from '../Playground/Playground.module.css';
import styles from './GenerationConfig.module.css';

interface Props {
  sites: SitePreview[] | null;
  running: boolean;
  error: string | null;
  previewKey: string;
  tab: Tab;
  onTab: (tab: Tab) => void;
}

/** The week the draft makes on the preview day, and the open site's level, play-testable. */
export function WeekPreview({ sites, running, error, previewKey, tab, onTab }: Props) {
  const [showSol, setShowSol] = useState(false);
  const open = tab === 'fallback' ? null : sites?.[tab] ?? null;
  const play = usePlacement(previewKey + '#' + tab);
  const crossings = useMemo(() => (open ? crossingPairs(open.level) : []), [open]);
  const shown = open && showSol ? open.level.sol : play.placed;

  return (
    <>
      {sites && (
        <div className={styles.week} aria-label="the week">
          {sites.map((s, i) => {
            const sum = siteSummary(s);
            return (
              <button key={i} type="button" className={cx(styles.site, tab === i && styles.siteOpen)} onClick={() => onTab(i)}>
                <b>Site {i + 1}</b>
                <span>{sum.line}</span>
                <span className={cx(s.salt === null && styles.slow)}>{sum.made}</span>
                <span className={cx(sum.slow && styles.slow)}>{s.ms} ms</span>
              </button>
            );
          })}
        </div>
      )}
      <div className={pg.toolbar}>
        <span className={pg.toggle}>The week<Info k="week" /></span>
        <span className={pg.toggle}><label><input type="checkbox" checked={showSol} onChange={e => setShowSol(e.target.checked)} /> solution</label></span>
        {sites?.some(s => s.ms > SLOW_MS) && <span className={pg.warn}>a site took over {SLOW_MS} ms here</span>}
        {sites?.some(s => s.salt === null) && <span className={pg.warn}>a site fell back</span>}
      </div>
      <div className={cx(pg.stage, running && pg.stale)}>
        {error && <p className={pg.warn}>{error}</p>}
        {!sites && !error && <p className={pg.muted}>generating the week…</p>}
        {tab === 'fallback' && sites && (
          <p className={pg.muted}>The fallback only runs for a site whose retries all fail; the week above marks any site that used it.</p>
        )}
        {open && <>
          <SchematicView level={open.level} alt={null} crossings={crossings} placed={shown} dimRest={showSol}
            labels="degree" onTapNode={showSol ? undefined : play.toggle} />
          <PlayBar status={playStatus(open.level, shown)} showSol={showSol} onClear={play.clear} />
        </>}
      </div>
    </>
  );
}
