import type { Place } from '../../../../game/hooks/useBoard';
import type { Night } from '../../../../domain/types';
import { Button } from '../../kit/Button';
import { Figure } from '../../kit/Figure';
import { BoltIcon, MoonIcon, SwordsIcon } from '../../kit/icons';
import { MiniStar } from '../../kit/MiniStar';
import { PlaceLink } from '../../kit/PlaceLink';
import { Planet } from '../../kit/Planet';
import { Moon } from '../../kit/Moon';
import { Avatar, Eyebrow, Page } from '../../kit/Page';
import { useWide } from '../../kit/useWide';
import { TabBar, type Tab } from '../../kit/TabBar';
import { cx } from '../../kit/cx';
import type { SkyEntry } from '../../play/sky';
import { nightDate, plural, weekOf } from '../../copy';
import type { Level } from '../../../../domain/types';
import { SecretTitle } from './SecretTitle';
import type { TonightState } from './tonight';
import styles from './Tonight.module.css';

export interface ModeCard {
  /** "Mars 14/20", "Best 9 skies", "1 waiting"; null when there is nothing to say */
  stat: string | null;
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
  week: Night[];
  initial: string;
  avatar?: string | null;
  voyage: ModeCard & { planet: string; art: string };
  rush: ModeCard;
  duel: ModeCard & { waiting: boolean };
  /** where the player stands on tonight's board, once a sky is charted; null otherwise */
  place?: Place | null;
  onBoard?: () => void;
  onContinue: () => void;
  onTab: (tab: Tab) => void;
  /** the seventh tap on the title */
  onSecret: () => void;
}

function WeekMoons({ day, week, size }: { day: number; week: Night[]; size: number }) {
  return (
    <div className={styles.week}>
      {weekOf(day).map(w => (
        <div key={w.day} className={styles.weekDay}>
          <Moon night={week.find(n => n.day === w.day)} size={size} today={w.day === day} future={w.day > day} />
          <span className={cx(styles.weekLabel, w.day === day && styles.weekToday)}>{w.label}</span>
        </div>
      ))}
    </div>
  );
}

function NightCard({ day, tonight, skies, preview, place, onBoard, onContinue, wide }: Pick<Props, 'day' | 'tonight' | 'skies' | 'preview' | 'place' | 'onBoard' | 'onContinue'> & { wide: boolean }) {
  const label = tonight.done ? 'See tonight’s figure' : tonight.charted === 0 ? 'Start tonight' : `Continue · sky ${tonight.next + 1}`;
  const left = tonight.total - tonight.charted;
  return (
    <section className={cx(styles.night, wide && styles.nightWide)}>
      <div className={styles.nightText}>
        <div className={styles.nightHead}><Eyebrow>Tonight · No. {day}{wide ? ' · ' + nightDate(day) : ''}</Eyebrow>{!wide && <span className={styles.date}>{nightDate(day)}</span>}</div>
        {!wide && preview && <div className={styles.preview}><Figure figure={preview} mode="dim" /></div>}
        <h2 className={wide ? styles.nightTitleWide : styles.nightTitle}>{tonight.charted} of {tonight.total} skies charted</h2>
        {wide && (
          <p className={styles.blurb}>
            {tonight.done
              ? `All ${tonight.total} charted, ${tonight.atPar} at par. Name the figure you found and add it to your atlas.`
              : `${left === 1 ? 'One to go' : `${left} to go`}. Skies get busier toward ${tonight.total}. Hit par on all ${tonight.total} for a full moon and a constellation to name.`}
          </p>
        )}
        {place && onBoard && <PlaceLink place={place} label="tonight" onOpen={onBoard} />}
        <div className={styles.stars}>{skies.map(k => <MiniStar key={k.n} state={k.state === 'cur' && !tonight.done ? 'cur' : k.state === 'cur' ? 'next' : k.state} size={wide ? 34 : 30} />)}</div>
        <Button block={!wide} onClick={onContinue} className={wide ? styles.continueWide : undefined}>{label}</Button>
      </div>
      {wide && preview && <div className={styles.previewWide}><Figure figure={preview} mode="dim" /></div>}
    </section>
  );
}

/* Tonight (1b phone, 1m desktop): the hub. Tonight's seven skies front and centre, the week as moons, then the
   voyage, Meteor Rush and Star Duel. Tapping the title seven times opens the old CATASTROPHE INC. look. */
export function TonightScreen(p: Props) {
  const wide = useWide();
  const title = <SecretTitle onSecret={p.onSecret} wide={wide} />;
  const streak = <div className={styles.streak}><MoonIcon size={16} />{plural(p.streak, 'night')}</div>;

  if (wide) {
    return (
      <Page tone="night" wide>
        <div className={styles.desk}>
          <header className={styles.deskHead}>
            {title}
            <nav className={styles.deskNav} aria-label="Stargazer">
              <button className={cx(styles.navItem, styles.navOn)} aria-current="page">Tonight</button>
              <button className={styles.navItem} onClick={() => p.onTab('atlas')}>Atlas</button>
              <button className={styles.navItem} onClick={p.voyage.onOpen}>Voyage</button>
              <button className={styles.navItem} onClick={p.rush.onOpen}>Rush</button>
              <button className={styles.navItem} onClick={p.duel.onOpen}>Duel</button>
            </nav>
            <div className={styles.deskRight}>{streak}<button className={styles.me} aria-label="Me" onClick={() => p.onTab('me')}><Avatar letter={p.initial} avatar={p.avatar} /></button></div>
          </header>
          <div className={styles.deskBody}>
            <NightCard {...p} wide />
            <div className={styles.deskSide}>
              <div className={styles.weekCard}><WeekMoons day={p.day} week={p.week} size={32} /></div>
              <button className={styles.row} onClick={p.voyage.onOpen}>
                <Planet art={p.voyage.art} size={52} />
                <span className={styles.rowText}><b>Voyage</b><span>{p.voyage.stat ?? p.voyage.planet}</span></span>
                <span className={styles.rowGo}>{p.voyage.action}</span>
              </button>
              <button className={styles.row} onClick={p.rush.onOpen}>
                <span className={cx(styles.badge, styles.badgeMars)}><BoltIcon size={24} /></span>
                <span className={styles.rowText}><b>Meteor Rush</b><span>{p.rush.stat ?? 'Chart skies before dawn'}</span></span>
                <span className={cx(styles.rowGo, styles.goMars)}>{p.rush.action}</span>
              </button>
              <button className={styles.row} onClick={p.duel.onOpen}>
                <span className={cx(styles.badge, styles.badgeMint)}><SwordsIcon size={24} /></span>
                <span className={styles.rowText}><b>Star Duel</b><span>{p.duel.stat ?? 'Same sky, fewest stars wins'}</span></span>
                <span className={cx(styles.rowGo, styles.goMint)}>{p.duel.action}</span>
              </button>
            </div>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page tone="night">
      <div className={styles.head}>{title}{streak}</div>
      <div className={styles.weekCard}><WeekMoons day={p.day} week={p.week} size={26} /></div>
      <NightCard {...p} wide={false} />
      <div className={styles.tiles}>
        <button className={styles.tile} onClick={p.voyage.onOpen}>
          <Planet art={p.voyage.art} size={34} />
          <span className={styles.tileText}><b>Voyage</b><span>{p.voyage.stat ?? p.voyage.planet}</span></span>
        </button>
        <button className={styles.tile} onClick={p.rush.onOpen}>
          <span className={cx(styles.badgeSmall, styles.badgeMars)}><BoltIcon /></span>
          <span className={styles.tileText}><b>Rush</b><span>{p.rush.stat ?? 'Before dawn'}</span></span>
        </button>
        <button className={styles.tile} onClick={p.duel.onOpen}>
          {p.duel.waiting && <span className={styles.ping} aria-label="a challenge is waiting" />}
          <span className={cx(styles.badgeSmall, styles.badgeMint)}><SwordsIcon /></span>
          <span className={styles.tileText}><b>Duel</b><span>{p.duel.stat ?? 'Same sky'}</span></span>
        </button>
      </div>
      <TabBar active="tonight" onOpen={p.onTab} />
    </Page>
  );
}
