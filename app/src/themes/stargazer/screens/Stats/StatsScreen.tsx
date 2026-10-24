import type { ReactNode } from 'react';
import { signed } from '../../../../domain/rating';
import type { BoardKind } from '../../../../domain/ranking';
import { percent, hasPlayed, type DuelResultMark, type PlayerStats } from '../../../../domain/stats';
import { CAMPAIGN_LEVELS } from '../../../../domain/types';
import { useMyPlace } from '../../../../game/hooks/useBoard';
import { useStats } from '../../../../game/hooks/useStats';
import { Button } from '../../kit/Button';
import { Scroll } from '../../kit/Layout';
import { Eyebrow, Note, Page, TopBar } from '../../kit/Page';
import { PlaceLink } from '../../kit/PlaceLink';
import { Sparkline } from '../../kit/Sparkline';
import { cx } from '../../kit/cx';
import { plural } from '../../copy';
import styles from './Stats.module.css';

interface Props {
  userId: string | null;
  /** tonight, for the week's place */
  today: number;
  onBoard: (kinds: BoardKind[]) => void;
  onSignIn: () => void;
  onBack: () => void;
}

const num = (n: number) => n.toLocaleString();
const pct = (part: number, whole: number) => { const p = percent(part, whole); return p === null ? '—' : p + '%'; };
const MARK: Record<DuelResultMark, { letter: string; word: string }> = { won: { letter: 'W', word: 'won' }, lost: { letter: 'L', word: 'lost' }, drawn: { letter: 'T', word: 'tied' } };

function Tiles({ items, cols = 3 }: { items: [value: ReactNode, label: string][]; cols?: 2 | 3 }) {
  return <div className={cx(styles.tiles, cols === 2 && styles.tilesTwo)}>{items.map(([v, l]) => <div key={l} className={styles.tile}><b>{v}</b><span>{l}</span></div>)}</div>;
}

function Section({ title, tone, children }: { title: string; tone?: 'mars' | 'mint'; children: ReactNode }) {
  return <section className={styles.section}><Eyebrow tone={tone}>{title}</Eyebrow>{children}</section>;
}

function Nights({ s, places }: { s: PlayerStats; places: ReactNode }) {
  const n = s.nights;
  return (
    <Section title="Nights">
      <Tiles items={[[n.played, 'nights charted'], [n.perfect, 'full moons'], [num(n.skies), 'skies charted'],
        [pct(n.atPar, n.skies), 'at par'], [num(n.points), 'points'], [n.bestPoints, 'best night']]} />
      <div className={styles.line}>
        <span>Streak <b>{plural(s.streak.current, 'night')}</b> · best <b>{s.streak.best}</b></span>
        <span className={styles.places}>{places}</span>
      </div>
    </Section>
  );
}

function Duel({ s, place }: { s: PlayerStats; place: ReactNode }) {
  const d = s.duel;
  return (
    <Section title="Star Duel" tone="mint">
      {d.played === 0 && d.games === 0 ? <p className={styles.empty}>No duels yet. Challenge a fellow stargazer, or find a ranked opponent.</p> : (
        <>
          <Tiles items={[[d.rating ?? '—', 'rating'], [d.peak ?? '—', 'peak'], [d.games, 'ranked duels'],
            [d.seasonGames > 0 ? signed(d.seasonGain) : '—', 'this month'], [`${d.won}–${d.lost}–${d.drawn}`, 'won–lost–tied'], [pct(d.won, d.played), 'won']]} />
          {d.form.length > 0 && (
            <div className={styles.form} aria-label={'Last duels, newest first: ' + d.form.map(m => MARK[m].word).join(', ')}>
              <span>Form</span>
              {d.form.map((m, i) => <i key={i} className={cx(styles.mark, styles['mark-' + m])} aria-hidden="true">{MARK[m].letter}</i>)}
            </div>
          )}
          {d.history.length > 1 && <Sparkline values={d.history} label={`Rating over your last ${d.history.length} ranked duels`} />}
        </>
      )}
      {place}
    </Section>
  );
}

/* Stats: everything the player has done, in one page outside play: nights, the voyage, Meteor Rush and the duel
   ladder, each with the place they hold and a way into that board. Read once (`useStats`); it never blocks play. */
export function StatsScreen({ userId, today, onBoard, onSignIn, onBack }: Props) {
  const { stats, loading, error } = useStats(userId);
  const week = useMyPlace('week', userId, { day: today });
  const allTime = useMyPlace('alltime', userId);
  const voyage = useMyPlace('voyage', userId);
  const rush = useMyPlace('rush', userId);
  const duel = useMyPlace('duel', userId);

  const link = (p: ReturnType<typeof useMyPlace>, label: string, kinds: BoardKind[]) => p && <PlaceLink place={p} label={label} onOpen={() => onBoard(kinds)} />;

  return (
    <Page tone="night">
      <TopBar title="Stats" onBack={onBack} backLabel="Observatory" />
      {!userId ? (
        <>
          <Note>Your numbers are kept for signed-in stargazers. Tonight’s skies are open to everyone.</Note>
          <Button block onClick={onSignIn}>Sign in</Button>
        </>
      ) : error ? <Note tone="error">Couldn’t read your stats. {error}</Note>
        : !stats || loading ? <Note>Reading your logbook…</Note>
        : !hasPlayed(stats) ? <Note>Nothing charted yet. Chart a sky tonight, fly a voyage level or try a Meteor Rush, and your numbers will gather here.</Note>
        : (
          <Scroll label="Your stats">
            <Nights s={stats} places={<>{link(week, 'this week', ['week', 'night', 'alltime'])}{link(allTime, 'all time', ['alltime', 'night', 'week'])}</>} />
            <Section title="Voyage">
              <Tiles items={[[`${stats.voyage.levels} / ${CAMPAIGN_LEVELS}`, 'levels charted'], [`${stats.voyage.stars} / ${CAMPAIGN_LEVELS * 3}`, 'stars'],
                [pct(stats.voyage.atPar, stats.voyage.levels), 'at par']]} />
              {link(voyage, 'among voyagers', ['voyage'])}
            </Section>
            <Section title="Meteor Rush" tone="mars">
              {stats.rush.runs === 0 ? <p className={styles.empty}>No runs yet. Chart as many skies as you can before dawn.</p> : (
                <Tiles items={[[plural(stats.rush.bestSites, 'sky', 'skies'), 'best run'], [num(stats.rush.bestScore), 'points in it'],
                  [stats.rush.runs, 'runs'], [num(stats.rush.totalSites), 'skies in all']]} cols={2} />
              )}
              {link(rush, 'in Meteor Rush', ['rush'])}
            </Section>
            <Duel s={stats} place={link(duel, 'on the ladder', ['duel', 'season'])} />
          </Scroll>
        )}
    </Page>
  );
}
