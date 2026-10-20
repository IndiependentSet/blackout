import { useState } from 'react';
import { CHAPTERS, chapterOf, chapterProgress, unlockedUpTo, type CampaignClears, type Chapter } from '../../../../domain/campaign';
import { CAMPAIGN_LEVELS } from '../../../../domain/types';
import type { Persistence } from '../../../../game/hooks/useCampaignClears';
import { usePoolPublished } from '../../../../game/hooks/usePoolPublished';
import { Button } from '../../kit/Button';
import { cx } from '../../kit/cx';
import { LockIcon } from '../../kit/icons';
import { Planet } from '../../kit/Planet';
import { Eyebrow, Note, Page, TopBar } from '../../kit/Page';
import { NO_SKIES, planetOf } from '../../copy';
import styles from './Voyage.module.css';

/** How far each level's stop sits from the left, so the path winds down the page. */
const WAVE = [24, 92, 150, 120, 52, 14, 70];

interface Props {
  signedIn: boolean;
  clears: CampaignClears;
  persistence: Persistence;
  onOpenLevel: (levelNo: number) => void;
  onSignIn: () => void;
  onBack: () => void;
}

function Stop({ n, ch, clears, unlocked, offset, onOpen }: { n: number; ch: Chapter; clears: CampaignClears; unlocked: number; offset: number; onOpen: (n: number) => void }) {
  const clear = clears.get(n);
  const local = n - ch.from + 1;
  if (clear) {
    const over = clear.run.used - clear.run.par;
    return (
      <div className={styles.stop} style={{ paddingLeft: offset }}>
        <button className={styles.done} aria-label={`Level ${local}, charted, play again`} onClick={() => onOpen(n)}>{local}</button>
        <span className={styles.note}>{over <= 0 ? 'par' : '+' + over}</span>
      </div>
    );
  }
  if (n === unlocked) {
    return (
      <div className={styles.stop} style={{ paddingLeft: offset }}>
        <div className={styles.current} aria-hidden="true">{local}</div>
        <Button size="sm" onClick={() => onOpen(n)}>Fly to {local}</Button>
      </div>
    );
  }
  return <div className={styles.stop} style={{ paddingLeft: offset }}><div className={styles.locked} aria-label={`Level ${local}, locked`}>{local}</div></div>;
}

/* Voyage (1f): the campaign, one world per chapter. A level opens once the one before it is charted. */
export function VoyageScreen({ signedIn, clears, persistence, onOpenLevel, onSignIn, onBack }: Props) {
  const pool = usePoolPublished('campaign');
  const unlocked = unlockedUpTo(clears);
  const reach = (chapterOf(unlocked) ?? CHAPTERS[0]).index;
  const [open, setOpen] = useState<number | null>(null);
  const ch = CHAPTERS[open ?? reach];
  const progress = chapterProgress(clears, ch);
  const planet = planetOf(ch.index);
  const next = CHAPTERS[ch.index + 1];
  const cleared = [...clears.keys()].length;

  if (!signedIn) {
    return (
      <Page tone="night">
        <TopBar title="Voyage" onBack={onBack} backLabel="Tonight" />
        <Note>The voyage keeps your record from world to world, so it needs you signed in. Tonight’s skies are open to everyone.</Note>
        <Button block onClick={onSignIn}>Sign in</Button>
      </Page>
    );
  }

  return (
    <Page tone="night" className={styles.page}>
      <TopBar title="Voyage" onBack={onBack} backLabel="Tonight" right={`${cleared} / ${CAMPAIGN_LEVELS}`} />
      <div className={styles.worlds} role="tablist" aria-label="Worlds">
        {CHAPTERS.map(c => (
          <button key={c.index} role="tab" aria-selected={c.index === ch.index} aria-label={planetOf(c.index).name}
            disabled={c.index > reach} className={cx(styles.world, c.index === ch.index && styles.worldOn)} onClick={() => setOpen(c.index)}>
            <Planet art={planetOf(c.index).art} className={styles.worldDot} />
          </button>
        ))}
      </div>
      <section className={styles.chapter}>
        <Planet art={planet.art} className={styles.planetBig} />
        <Eyebrow tone="mars">Chapter {ch.index + 1}</Eyebrow>
        <h2 className={styles.chapterName}>{planet.name}</h2>
        <div className={styles.progress}>
          <div className={styles.track}><div className={styles.fill} style={{ width: (progress.cleared / progress.total) * 100 + '%' }} /></div>
          <span>{progress.cleared} / {progress.total}</span>
        </div>
      </section>
      {persistence === 'memory' && <Note>Your progress isn’t saved yet; it will be once the connection is back.</Note>}
      {pool === 'empty' && <Note>{NO_SKIES}</Note>}
      <div className={styles.path}>
        {Array.from({ length: ch.to - ch.from + 1 }, (_, i) => ch.from + i).map((n, i) => (
          <Stop key={n} n={n} ch={ch} clears={clears} unlocked={unlocked} offset={WAVE[i % WAVE.length]}
            onOpen={pool === 'empty' || persistence === 'loading' ? () => {} : onOpenLevel} />
        ))}
      </div>
      {next ? (
        <section className={styles.nextWorld}>
          <Planet art={planetOf(next.index).art} className={styles.planetNext} />
          <Eyebrow tone="faint">{next.index > reach && <LockIcon />} Chapter {next.index + 1}</Eyebrow>
          <div className={styles.nextName}>{planetOf(next.index).name}</div>
        </section>
      ) : <section className={styles.nextWorld}><Eyebrow tone="faint">The last world</Eyebrow><div className={styles.nextName}>Beyond Neptune: nothing yet</div></section>}
    </Page>
  );
}
