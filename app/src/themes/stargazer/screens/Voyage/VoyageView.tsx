import type { CSSProperties } from 'react';
import { CHAPTERS, type Chapter } from '../../../../domain/campaign';
import { Button } from '../../kit/Button';
import { cx } from '../../kit/cx';
import { LockIcon } from '../../kit/icons';
import { Eyebrow } from '../../kit/Page';
import { Planet } from '../../kit/Planet';
import { planetOf } from '../../copy';
import styles from './Voyage.module.css';

/* The Voyage screen's parts, drawn from plain data. The screen puts real clears into them; the flight between
   worlds (VoyageTransit) puts the same parts through their last frames, so the two always look alike. */

export type StopState = 'done' | 'current' | 'locked';

interface StopProps {
  /** the level's number within its world, from 1 */
  local: number;
  state: StopState;
  /** strokes over par, for a charted stop */
  over?: number;
  offset: number;
  onOpen?: () => void;
  /** a charted stop popping as it is charted, 0 to 1 */
  burst?: number;
  /** the current stop's glow, when something is driving it */
  glow?: number;
}

export function Stop({ local, state, over, offset, onOpen, burst = -1, glow }: StopProps) {
  if (state === 'done') {
    const popping = burst >= 0 && burst <= 1;
    const style: CSSProperties | undefined = popping ? { transform: `scale(${1 + 0.18 * Math.sin(Math.min(1, burst * 2) * Math.PI)})` } : undefined;
    return (
      <div className={styles.stop} style={{ paddingLeft: offset }}>
        <button className={styles.done} style={style} aria-label={`Level ${local}, charted, play again`} onClick={onOpen}>
          {local}
          {popping && <span className={styles.burst} style={{ opacity: 1 - burst, transform: `scale(${1 + burst * 1.6})` }} />}
        </button>
        {over !== undefined && <span className={styles.note}>{over <= 0 ? 'par' : '+' + over}</span>}
      </div>
    );
  }
  if (state === 'current') {
    const style: CSSProperties | undefined = glow === undefined ? undefined
      : { boxShadow: `0 0 0 6px rgba(255, 217, 138, ${glow}), 0 0 30px rgba(255, 217, 138, .6)` };
    return (
      <div className={styles.stop} style={{ paddingLeft: offset }} data-current>
        <div className={styles.current} style={style} aria-hidden="true">{local}</div>
        <Button size="sm" onClick={onOpen}>Fly to {local}</Button>
      </div>
    );
  }
  return <div className={styles.stop} style={{ paddingLeft: offset }}><div className={styles.locked} aria-label={`Level ${local}, locked`}>{local}</div></div>;
}

interface WorldsProps {
  current: number;
  reach: number;
  onPick?: (chapter: number) => void;
  /** the gold ring's opacity, when something is driving it */
  ring?: number;
}

export function WorldsRow({ current, reach, onPick, ring }: WorldsProps) {
  return (
    <div className={styles.worlds} role="tablist" aria-label="Worlds">
      {CHAPTERS.map(c => (
        <button key={c.index} role="tab" aria-selected={c.index === current} aria-label={planetOf(c.index).name}
          disabled={c.index > reach} className={cx(styles.world, c.index === current && ring === undefined && styles.worldOn)}
          style={c.index === current && ring !== undefined ? { boxShadow: `inset 0 0 0 2px color-mix(in srgb, var(--sg-gold) ${Math.round(ring * 100)}%, transparent)` } : undefined}
          onClick={() => onPick?.(c.index)}>
          <Planet art={planetOf(c.index).art} className={styles.worldDot} />
        </button>
      ))}
    </div>
  );
}

interface ChapterProps {
  chapter: Chapter;
  cleared: number;
  /** the bar's fill, 0 to 1, when something is driving it */
  fill?: number;
  /** the planet's size, when it is popping in */
  pop?: number;
}

export function ChapterCard({ chapter, cleared, fill, pop }: ChapterProps) {
  const total = chapter.to - chapter.from + 1;
  const planet = planetOf(chapter.index);
  return (
    <section className={styles.chapter}>
      <Planet art={planet.art} className={styles.planetBig} style={pop === undefined ? undefined : { transform: `scale(${pop})` }} />
      <Eyebrow tone="mars">Chapter {chapter.index + 1}</Eyebrow>
      <h2 className={styles.chapterName}>{planet.name}</h2>
      <div className={styles.progress}>
        <div className={styles.track}><div className={styles.fill} style={{ width: (fill ?? cleared / total) * 100 + '%' }} /></div>
        <span>{cleared} / {total}</span>
      </div>
    </section>
  );
}

interface NextProps {
  next: Chapter | undefined;
  locked: boolean;
  /** the world unlocking, 0 to 1, when something is driving it */
  unlock?: number;
}

export function NextWorld({ next, locked, unlock }: NextProps) {
  if (!next) return <section className={styles.nextWorld}><Eyebrow tone="faint">The last world</Eyebrow><div className={styles.nextName}>Beyond Neptune: nothing yet</div></section>;
  const opening = unlock !== undefined && unlock < 1;
  const lit = unlock === undefined ? !locked : unlock >= 1;
  return (
    <section className={cx(styles.nextWorld, lit && styles.nextOpen)}
      style={opening && unlock > 0 ? { boxShadow: `inset 0 0 0 2px color-mix(in srgb, var(--sg-gold) ${Math.round(Math.sin(unlock * Math.PI) * 60)}%, transparent)` } : undefined}>
      <Planet art={planetOf(next.index).art} className={styles.planetNext} style={opening ? { opacity: 0.45 + 0.55 * unlock } : undefined} />
      <Eyebrow tone="faint">{(locked || opening) && <LockIcon />} Chapter {next.index + 1}</Eyebrow>
      <div className={styles.nextName}>{planetOf(next.index).name}</div>
    </section>
  );
}
