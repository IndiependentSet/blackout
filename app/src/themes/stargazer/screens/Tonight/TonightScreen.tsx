import type { CSSProperties } from 'react';
import { placeText } from '../../../../domain/ranking';
import type { Place } from '../../../../game/hooks/useBoard';
import type { Level } from '../../../../domain/types';
import { Button } from '../../kit/Button';
import { DeskHeader, StreakPill, type DeskDest } from '../../kit/DeskHeader';
import { Figure } from '../../kit/Figure';
import { BoltIcon, SwordsIcon } from '../../kit/icons';
import { ListCard, ListRow } from '../../kit/ListCard';
import { Planet } from '../../kit/Planet';
import { Eyebrow, Page } from '../../kit/Page';
import { ProgressStars } from '../../kit/ProgressStars';
import { useWide } from '../../kit/useWide';
import { TabBar, type Tab } from '../../kit/TabBar';
import { cx } from '../../kit/cx';
import type { SkyEntry } from '../../play/sky';
import { nightDate } from '../../copy';
import { SecretTitle } from './SecretTitle';
import type { TonightState } from './tonight';
import styles from './Tonight.module.css';

export interface ModeCard {
  /** the row's description: "Mars · 14 of 20 levels", "Best run: 9 skies" */
  detail: string;
  /** a mint pill beside it ("2 waiting"); null when there is nothing waiting */
  badge?: string | null;
  /** the desktop row's action label */
  action: string;
  onOpen: () => void;
}

interface Props {
  day: number;
  tonight: TonightState;
  skies: SkyEntry[];
  preview: Level | null;
  /** nights in a row with a sky charted */
  streak: number;
  initial: string;
  avatar?: string | null;
  voyage: ModeCard & { art: string };
  rush: ModeCard;
  duel: ModeCard;
  /** where the player stands on tonight's board, once a sky is charted; null otherwise */
  place?: Place | null;
  onBoard?: () => void;
  onContinue: () => void;
  onTab: (tab: Tab) => void;
  /** a place the desktop header goes to */
  onGo: (dest: DeskDest) => void;
  /** the seventh tap on the title */
  onSecret: () => void;
}

function NightCard({ day, tonight, skies, preview, onContinue, wide }: Pick<Props, 'day' | 'tonight' | 'skies' | 'preview' | 'onContinue'> & { wide: boolean }) {
  const label = tonight.done ? 'See tonight’s figure' : tonight.charted === 0 ? 'Start tonight' : 'Continue';
  const title = tonight.done ? `All ${tonight.total} charted` : `Sky ${tonight.next + 1} of ${tonight.total}`;
  const left = tonight.total - tonight.charted;
  const figure = preview && <Figure figure={preview} mode="dim" />;
  if (wide) {
    return (
      <section className={cx(styles.night, styles.nightWide)}>
        <div className={styles.nightText}>
          <Eyebrow>Tonight · No. {day} · {nightDate(day)}</Eyebrow>
          <h2 className={styles.nightTitleWide}>{title}</h2>
          <p className={styles.blurb}>
            {tonight.done
              ? `All ${tonight.total} charted, ${tonight.atPar} at par. Name the figure you found and add it to your atlas.`
              : `${left === 1 ? 'One to go' : `${left} to go`}. Skies get busier toward ${tonight.total}. Hit par on all ${tonight.total} for a full moon and a constellation to name.`}
          </p>
          <ProgressStars skies={skies} />
          <span className={styles.caption}>{tonight.charted} charted · {tonight.atPar} at par</span>
          <Button onClick={onContinue} className={styles.continueWide}>{label}</Button>
        </div>
        {figure && <div className={styles.previewWide}>{figure}</div>}
      </section>
    );
  }
  return (
    <section className={styles.night}>
      <div className={styles.nightHead}><Eyebrow>Tonight · No. {day}</Eyebrow><span className={styles.date}>{nightDate(day)}</span></div>
      {figure && <div className={styles.preview}>{figure}</div>}
      <div className={styles.nightTitleRow}>
        <h2 className={styles.nightTitle}>{title}</h2>
        <span className={styles.date}>{tonight.atPar} at par so far</span>
      </div>
      <ProgressStars skies={skies} />
      <Button block onClick={onContinue}>{label}</Button>
    </section>
  );
}

const iconFor = (p: Props, size: number) => ({
  voyage: <Planet art={p.voyage.art} size={size} />,
  rush: <span className={cx(styles.badge, styles.badgeMars)} style={{ '--badge': size + 'px' } as CSSProperties}><BoltIcon size={size * .5} /></span>,
  duel: <span className={cx(styles.badge, styles.badgeMint)} style={{ '--badge': size + 'px' } as CSSProperties}><SwordsIcon size={size * .5} /></span>,
});

/** The three other ways to play, as one list. `wide` swaps the chevrons for the action labels and enlarges the icons. */
function MoreWays({ p, wide }: { p: Props; wide: boolean }) {
  const icons = iconFor(p, wide ? 44 : 36);
  const row = (key: 'voyage' | 'rush' | 'duel', title: string, tone: 'gold' | 'mars' | 'mint') => (
    <ListRow title={title} description={p[key].detail} badge={p[key].badge ?? undefined} icon={icons[key]}
      action={wide && !p[key].badge ? p[key].action : undefined} actionTone={tone} onClick={p[key].onOpen} />
  );
  return (
    <section className={styles.ways}>
      <Eyebrow tone="soft">More ways to play</Eyebrow>
      <ListCard>{row('voyage', 'Voyage', 'gold')}{row('rush', 'Meteor Rush', 'mars')}{row('duel', 'Star Duel', 'mint')}</ListCard>
    </section>
  );
}

/* Tonight (phone and desktop): the hub. Tonight's seven skies front and centre, then the voyage, Meteor Rush and Star
   Duel. Tapping the title seven times opens the old CATASTROPHE INC. look. */
export function TonightScreen(p: Props) {
  const wide = useWide();
  const title = <SecretTitle onSecret={p.onSecret} wide={wide} />;

  if (wide) {
    return (
      <Page tone="night" wide>
        <div className={styles.desk}>
          <DeskHeader active="tonight" brand={title} streak={p.streak} initial={p.initial} avatar={p.avatar} onGo={p.onGo} />
          <div className={styles.deskBody}>
            <NightCard {...p} wide />
            <div className={styles.deskSide}>
              {p.place && p.onBoard && (
                <button className={styles.boardCard} onClick={p.onBoard} aria-label={`Tonight’s leaderboard, ${placeText(p.place.entry, p.place.total)}. Open the board`}>
                  <span className={styles.boardText}><b>Tonight’s leaderboard</b><span>{placeText(p.place.entry, p.place.total)}</span></span>
                  <span className={styles.open}>Open ›</span>
                </button>
              )}
              <MoreWays p={p} wide />
            </div>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page tone="night">
      <div className={styles.head}>{title}<StreakPill streak={p.streak} className={styles.streak} /></div>
      <NightCard {...p} wide={false} />
      <MoreWays p={p} wide={false} />
      <TabBar active="tonight" onOpen={p.onTab} />
    </Page>
  );
}
