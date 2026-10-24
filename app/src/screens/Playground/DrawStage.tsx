import { useState } from 'react';
import { encodeFigure, type FigureCheck } from '../../domain/generation';
import type { SkyFigure } from '../../domain/types';
import { Button } from '../../themes/stargazer/kit/Button';
import { cx } from '../../themes/stargazer/kit/cx';
import { SkyEditor } from '../SkyEditor/SkyEditor';
import { playStatus } from './play';
import { PlayBar } from './PlayBar';
import { PlayPreview } from './PlayPreview';
import { usePlacement } from './usePlacement';
import styles from './Playground.module.css';

type View = 'draw' | 'sky';

/** The playground's Draw mode: the hand-drawn sky editor, and the drawing played as the game's sky. */
export function DrawStage({ figure, onChange, check, startFrom }: {
  figure: SkyFigure; onChange: (f: SkyFigure) => void; check: FigureCheck; startFrom: SkyFigure | null;
}) {
  const [view, setView] = useState<View>('draw');
  const [showSol, setShowSol] = useState(false);
  const key = encodeFigure(figure);
  const play = usePlacement(key);
  const level = check.level;
  const shown = level && showSol ? level.sol : play.placed;
  return (
    <>
      <div className={styles.toolbar}>
        <Button size="xs" kind={view === 'draw' ? 'primary' : 'soft'} onClick={() => setView('draw')}>Draw</Button>
        <Button size="xs" kind={view === 'sky' ? 'primary' : 'soft'} disabled={!level} onClick={() => setView('sky')}>Play as sky</Button>
        <span className={styles.toggle}><label><input type="checkbox" checked={showSol} onChange={e => setShowSol(e.target.checked)} /> solution</label></span>
        {level && <Button size="xs" kind="outline" title="copy the level as JSON"
          onClick={() => navigator.clipboard?.writeText(JSON.stringify(level))}>Copy JSON</Button>}
      </div>
      <div className={cx(styles.stage)}>
        {(view === 'draw' || !level)
          ? <SkyEditor figure={figure} onChange={onChange} check={check} showAnswer={showSol} startFrom={startFrom} />
          : <PlayPreview key={key} level={level} placed={shown} onTapNode={showSol ? undefined : play.toggle} />}
        {level && view === 'sky' && <PlayBar status={playStatus(level, shown)} showSol={showSol} onClear={play.clear} />}
      </div>
    </>
  );
}
