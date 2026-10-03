import { useState } from 'react';
import { Button, cx } from '../../../ui';
import { MiniBoard } from '../MiniBoard';
import { Floor, Stamp } from '../primitives';
import { TRAIN_EDGES, TRAIN_K, TRAIN_NODES, trainingState, type NoteTone } from '../training';
import styles from '../Demos.module.css';

const TONE: Record<NoteTone, string> = { neutral: 'var(--lavender)', good: 'var(--mint)', bad: 'var(--rose)', hint: 'var(--gold)' };

/** Your turn: the real mechanic on a hand-made site. */
export function TrainingDemo() {
  const [placed, setPlaced] = useState<number[]>([]);
  const [taps, setTaps] = useState(0);
  const tap = (i: number) => {
    setTaps(n => n + 1);
    setPlaced(p => (p.includes(i) ? p.filter(x => x !== i) : [...p, i]));
  };
  const t = trainingState(placed, taps);

  return (
    <div className={styles.training}>
      <div className={styles.trainingBar}>
        <span style={{ color: placed.length > TRAIN_K ? 'var(--rose)' : 'var(--gold)' }}>CATS {placed.length}/{TRAIN_K}</span>
        <span className={styles.magenta}>SMASHED {t.smashed}/{TRAIN_EDGES.length}</span>
        <Button variant="secondary" size="mini" onClick={() => { setPlaced([]); setTaps(0); }}
          style={{ fontFamily: 'var(--font-display)', fontSize: 12, borderWidth: 3, borderRadius: 9, boxShadow: 'var(--lift-sm)', padding: '4px 10px' }}>RECALL CREW</Button>
      </div>
      <Floor>
        <MiniBoard viewBox="0 0 320 215" nodes={TRAIN_NODES} edges={TRAIN_EDGES} placed={placed} onTap={tap} pulse={t.pulse} label="training site: tap pads to hire cats" />
        {t.perfect && (
          <div className={styles.overlay}><Stamp style={{ fontSize: 30, padding: '6px 18px', transform: 'rotate(-8deg)' }}>PURR-FECT!</Stamp></div>
        )}
      </Floor>
      <div role="status" className={cx(styles.note)} style={{ color: TONE[t.tone] }}>{t.note}</div>
    </div>
  );
}
