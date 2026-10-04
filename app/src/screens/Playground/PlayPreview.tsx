import { useState } from 'react';
import { coveredEdges } from '../../domain/cover';
import type { Level } from '../../domain/types';
import { Board } from '../../game/components/Board';
import styles from './Playground.module.css';

/** The level on the real board, to feel how it plays. Tap pads to hire/recall.
    Remount (key) per level so the placed cats reset. */
export function PlayPreview({ level, showSol }: { level: Level; showSol: boolean }) {
  const [placed, setPlaced] = useState<number[]>([]);
  const [dim, setDim] = useState(false);
  const shown = showSol ? level.sol : placed;
  const open = level.edges.length - coveredEdges(level, shown).size;
  const toggle = (n: number) => setPlaced(p => (p.includes(n) ? p.filter(x => x !== n) : [...p, n]));

  return (
    <div className={styles.play}>
      <Board level={level} siteIdx={0} placed={shown} hint={null} focus={-1} kbd={false} dim={dim} expanded={false}
        onTapNode={showSol ? () => {} : toggle} onToggleExpand={() => {}} onToggleDim={() => setDim(d => !d)} />
      <div className={styles.playBar}>
        <span>Cats <b>{shown.length}</b> / par <b>{level.k}</b></span>
        <span>Open paths <b>{open}</b></span>
        {open === 0 && <b className={shown.length === level.k ? styles.good : styles.warn}>
          {shown.length === level.k ? 'Perfect' : `Cleared, ${shown.length - level.k} over par`}</b>}
        {!showSol && placed.length > 0 && <button className={styles.link} onClick={() => setPlaced([])}>clear</button>}
      </div>
    </div>
  );
}
