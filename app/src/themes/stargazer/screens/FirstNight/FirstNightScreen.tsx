import type { SkyFigure } from '../../../../domain/types';
import { Button } from '../../kit/Button';
import { Figure } from '../../kit/Figure';
import { DeskPage } from '../../kit/DeskPage';
import { Eyebrow } from '../../kit/Page';
import styles from './FirstNight.module.css';

/* The little sky the three steps are drawn on (the design's own example). */
const DEMO: SkyFigure = {
  nodes: [[0.5, 0.5], [1.5, 0.3], [2.55, 0.6], [0.8, 1.5], [2, 1.4], [0.45, 2.45], [1.6, 2.5], [2.65, 2.15]].map(([c, r]) => ({ c, r })),
  edges: [[0, 1], [1, 2], [0, 3], [1, 4], [2, 4], [3, 4], [3, 5], [4, 6], [6, 7], [2, 7], [5, 6]],
};
const DEMO_PAR = [1, 2, 3, 6];

const STEPS = [
  { lit: [], head: 'Every star starts asleep.', body: 'The figure is there, just too faint to see.' },
  { lit: [4], head: 'Tap a star to light it.', body: 'Every line touching it starts to glow.' },
  { lit: DEMO_PAR, head: 'Show it all with the fewest.', body: null },
];

interface Props {
  onStart: () => void;
  onClose: () => void;
}

/* First night (1a): how to play, in three pictures. Replaces the old orientation and work order. */
export function FirstNightScreen({ onStart, onClose }: Props) {
  return (
    <DeskPage active="tonight" tone="night" className={styles.page}>
      <Eyebrow>Your first night watch</Eyebrow>
      <h1 className={styles.title}>The sky is full of figures no one has named.</h1>
      <ol className={styles.steps}>
        {STEPS.map(s => (
          <li key={s.head} className={styles.step}>
            <div className={styles.thumb}><Figure figure={DEMO} mode={s.lit.length ? 'lit' : 'dim'} lit={s.lit} /></div>
            <div className={styles.text}>
              <b>{s.head}</b>
              <span>{s.body ?? <>The true minimum is <b className={styles.par}>par</b>. Hit it and the figure is yours to name.</>}</span>
            </div>
          </li>
        ))}
      </ol>
      <div className={styles.actions}>
        <Button block onClick={onStart}>Start my first sky</Button>
        <Button block kind="ghost" size="md" onClick={onClose}>I’ve played before</Button>
      </div>
    </DeskPage>
  );
}
