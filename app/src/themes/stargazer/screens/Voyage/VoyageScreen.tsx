import { useEffect, useRef, useState } from 'react';
import { CHAPTERS, chapterOf, chapterProgress, unlockedUpTo, type CampaignClears } from '../../../../domain/campaign';
import { CAMPAIGN_LEVELS } from '../../../../domain/types';
import type { Place } from '../../../../game/hooks/useBoard';
import type { Persistence } from '../../../../game/hooks/useCampaignClears';
import { usePoolPublished } from '../../../../game/hooks/usePoolPublished';
import { Button } from '../../kit/Button';
import { Scroll } from '../../kit/Layout';
import { PlaceLink } from '../../kit/PlaceLink';
import { DeskPage } from '../../kit/DeskPage';
import { Note, TopBar } from '../../kit/Page';
import { NO_SKIES } from '../../copy';
import { WAVE } from './wave';
import { ChapterCard, NextWorld, Stop, WorldsRow } from './VoyageView';
import styles from './Voyage.module.css';

interface Props {
  signedIn: boolean;
  clears: CampaignClears;
  persistence: Persistence;
  /** where the player stands among the voyagers; null before their first level */
  place?: Place | null;
  onBoard?: () => void;
  onOpenLevel: (levelNo: number) => void;
  onSignIn: () => void;
  onBack: () => void;
  /** the world to open on instead of the one the player has reached (the one they just charted, under the flight) */
  initialChapter?: number;
}

/* Voyage (1f): the campaign, one world per chapter. A level opens once the one before it is charted. */
export function VoyageScreen({ signedIn, clears, persistence, place, onBoard, onOpenLevel, onSignIn, onBack, initialChapter }: Props) {
  const pool = usePoolPublished('campaign');
  const unlocked = unlockedUpTo(clears);
  const reach = (chapterOf(unlocked) ?? CHAPTERS[0]).index;
  const [open, setOpen] = useState<number | null>(initialChapter ?? null);
  const ch = CHAPTERS[open ?? reach];
  const progress = chapterProgress(clears, ch);
  const next = CHAPTERS[ch.index + 1];
  const cleared = [...clears.keys()].length;
  const path = useRef<HTMLDivElement>(null);
  /* open the path on the stop to fly to next (or the top of a finished world; the last stop of one just charted) */
  useEffect(() => {
    const here = path.current?.querySelector('[data-current]') ?? (initialChapter === ch.index ? path.current?.lastElementChild : null);
    if (here && 'scrollIntoView' in here) here.scrollIntoView({ block: 'center' });
  }, [ch.index, initialChapter]);

  if (!signedIn) {
    return (
      <DeskPage active="voyage" tone="night">
        <TopBar title="Voyage" onBack={onBack} backLabel="Tonight" />
        <Note>The voyage keeps your record from world to world, so it needs you signed in. Tonight’s skies are open to everyone.</Note>
        <Button block onClick={onSignIn}>Sign in</Button>
      </DeskPage>
    );
  }

  return (
    <DeskPage active="voyage" tone="night" className={styles.page}>
      <TopBar title="Voyage" onBack={onBack} backLabel="Tonight" right={`${cleared} / ${CAMPAIGN_LEVELS}`} />
      <WorldsRow current={ch.index} reach={reach} onPick={setOpen} />
      <ChapterCard chapter={ch} cleared={progress.cleared} />
      {place && onBoard && <PlaceLink place={place} label="among voyagers" onOpen={onBoard} />}
      {persistence === 'memory' && <Note>Your progress isn’t saved yet; it will be once the connection is back.</Note>}
      {pool === 'empty' && <Note>{NO_SKIES}</Note>}
      <Scroll label="Levels" fade><div className={styles.path} ref={path}>
        {Array.from({ length: ch.to - ch.from + 1 }, (_, i) => ch.from + i).map((n, i) => {
          const clear = clears.get(n);
          return (
            <Stop key={n} local={n - ch.from + 1} state={clear ? 'done' : n === unlocked ? 'current' : 'locked'} over={clear ? clear.run.used - clear.run.par : undefined}
              offset={WAVE[i % WAVE.length]} onOpen={pool === 'empty' || persistence === 'loading' ? undefined : () => onOpenLevel(n)} />
          );
        })}
      </div></Scroll>
      <NextWorld next={next} locked={!!next && next.index > reach} />
    </DeskPage>
  );
}
