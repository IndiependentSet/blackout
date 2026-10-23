import { useState } from 'react';
import { Button } from '../../themes/stargazer/kit/Button';
import { cx } from '../../themes/stargazer/kit/cx';
import { playStatus } from '../Playground/play';
import { PlayBar } from '../Playground/PlayBar';
import { PlayPreview } from '../Playground/PlayPreview';
import type { PlaygroundParams } from '../Playground/params';
import { SchematicView } from '../Playground/SchematicView';
import { useGenerator } from '../Playground/useGenerator';
import { usePlacement } from '../Playground/usePlacement';
import pg from '../Playground/Playground.module.css';

/** A sky grown from the draft, as a schematic or as the game draws it, play-testable like the playground's. */
export function RecipePreview({ params }: { params: PlaygroundParams }) {
  const [view, setView] = useState<'schematic' | 'sky'>('sky');
  const { running, outcome, error, outcomeKey } = useGenerator(params);
  const play = usePlacement(outcomeKey);
  const level = outcome?.level ?? null;
  return (
    <>
      <div className={pg.toolbar}>
        <Button size="xs" kind={view === 'sky' ? 'primary' : 'soft'} onClick={() => setView('sky')}>Sky</Button>
        <Button size="xs" kind={view === 'schematic' ? 'primary' : 'soft'} onClick={() => setView('schematic')}>Schematic</Button>
        {level && <span className={pg.muted}>{level.nodes.length} stars · par {level.k} · {'★'.repeat(level.stars)}</span>}
        <span className={cx(pg.status, running && pg.busy)}>{running ? 'growing…' : error ? 'error' : 'preview'}</span>
      </div>
      <div className={cx(pg.stage, running && pg.stale)}>
        {error && <p className={pg.warn}>{error}</p>}
        {level && view === 'sky' && <PlayPreview key={outcomeKey} level={level} placed={play.placed} onTapNode={play.toggle} />}
        {level && view === 'schematic' && outcome && (
          <SchematicView level={level} alt={null} crossings={outcome.crossings} placed={play.placed} dimRest={false} labels="degree" onTapNode={play.toggle} />
        )}
        {!level && !running && !error && <p className={pg.warn}>No level grew with this shape at this size. Try another seed or size.</p>}
        {level && <PlayBar status={playStatus(level, play.placed)} showSol={false} onClear={play.clear} />}
      </div>
    </>
  );
}
