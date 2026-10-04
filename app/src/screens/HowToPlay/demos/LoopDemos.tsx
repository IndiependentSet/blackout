import type { MiniEdge, MiniNode } from '../lookup';
import { MiniBoard } from '../MiniBoard';
import { Floor, Stamp } from '../primitives';
import { useTick } from '../useTick';
import { cx } from '../../../ui';
import styles from '../Demos.module.css';

/** One path, two pads: a cat on either end scraps the fixture. */
export function PathDemo() {
  const t = useTick(1300);
  const phase = t % 4;           // 0 empty · 1-2 cat on the left · 3 cat on the right
  const placed = phase === 0 ? [] : phase === 3 ? [1] : [0];
  const nodes: MiniNode[] = [{ x: 60, y: 82, b: 4 }, { x: 260, y: 82, b: 1 }];
  return (
    <Floor>
      <MiniBoard viewBox="0 0 320 125" nodes={nodes} edges={[[0, 1, 'vase']]} placed={placed} label="one path between two pads" />
      <div className={cx(styles.caption, placed.length ? styles.magenta : styles.gold)}>
        {phase === 0 ? 'TWO EMPTY PADS. ONE NERVOUS VASE.' : phase === 3 ? 'OTHER END? STILL SCRAP.' : 'CAT ON ONE END → SCRAP.'}
      </div>
    </Floor>
  );
}

/** One cat on a busy pad covers four paths. */
export function StarDemo() {
  const t = useTick(1500);
  const on = t % 3 !== 0;
  const nodes: MiniNode[] = [{ x: 160, y: 98, b: 3 }, { x: 50, y: 48 }, { x: 270, y: 48 }, { x: 50, y: 160 }, { x: 270, y: 160 }];
  const edges: MiniEdge[] = [[0, 1, 'lamp'], [0, 2, 'books'], [0, 3, 'fishbowl'], [0, 4, 'plant']];
  return (
    <Floor>
      <MiniBoard viewBox="0 0 320 195" nodes={nodes} edges={edges} placed={on ? [0] : []} label="one cat on a busy pad covers four paths" />
      <div className={styles.corner}>{on && <Stamp key={t} tone="pink">1 CAT · 4 SMASHED</Stamp>}</div>
    </Floor>
  );
}

/** Two crews that both flatten the room — only the cheaper one gets paid. */
export function BudgetDemo() {
  const t = useTick(2200);
  const on = t % 2 === 1;
  const nodes: MiniNode[] = [{ x: 46, y: 60, b: 2 }, { x: 140, y: 60, b: 5 }, { x: 234, y: 60, b: 0 }];
  const edges: MiniEdge[] = [[0, 1, 'mug'], [1, 2, 'clock']];
  const crew = (placed: number[], good: boolean) => (
    <Floor pad={4}>
      <div className={styles.crewTag}>{good ? 'CREW B' : 'CREW A'}</div>
      <MiniBoard viewBox="0 0 280 100" nodes={nodes} edges={edges} placed={on ? placed : []} label={good ? 'one cat in the middle' : 'two cats on the ends'} />
      <div className={styles.stampCorner}>
        {on && (good
          ? <Stamp key={'g' + t} style={{ transform: 'rotate(-4deg)' }}>1 CAT · PURR-FECT</Stamp>
          : <Stamp key={'b' + t} tone="rose" style={{ transform: 'rotate(3deg)' }}>2 CATS · ACCOUNTS NOTICE</Stamp>)}
      </div>
    </Floor>
  );
  return <div className={styles.budgets}>{crew([0, 2], false)}{crew([1], true)}</div>;
}
