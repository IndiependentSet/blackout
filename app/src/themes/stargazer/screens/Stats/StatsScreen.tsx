import { useState } from 'react';
import { placeText, type BoardKind } from '../../../../domain/ranking';
import { hasPlayed, type DuelResultMark, type PlayerStats } from '../../../../domain/stats';
import { useMyPlace, type Place } from '../../../../game/hooks/useBoard';
import { useStats } from '../../../../game/hooks/useStats';
import { Button } from '../../kit/Button';
import { DeskHeader, type DeskProps } from '../../kit/DeskHeader';
import { Scroll } from '../../kit/Layout';
import { Eyebrow, Note, Page, TopBar } from '../../kit/Page';
import { Pills } from '../../kit/Pills';
import { Sparkline } from '../../kit/Sparkline';
import { useWide } from '../../kit/useWide';
import { cx } from '../../kit/cx';
import { MODES, statsView, type Mode, type StatsView } from './statsView';
import styles from './Stats.module.css';

interface Props {
  userId: string | null;
  /** tonight, for the week's place */
  today: number;
  /** the desktop header */
  desk: DeskProps;
  onBoard: (kinds: BoardKind[]) => void;
  onSignIn: () => void;
  onBack: () => void;
}

const MARK: Record<DuelResultMark, { letter: string; word: string }> = { won: { letter: 'W', word: 'won' }, lost: { letter: 'L', word: 'lost' }, drawn: { letter: 'T', word: 'tied' } };

interface Places { main: Place | null; /** nights also read the all-time place */ extra?: Place | null }

function Hero({ view }: { view: StatsView }) {
  return (
    <>
      <Eyebrow tone={view.tone}>{view.eyebrow}</Eyebrow>
      {view.empty ? <p className={styles.empty}>{view.empty}</p> : (
        <>
          <b className={styles.hero}>{view.hero}</b>
          <span className={styles.heroSub}>{view.heroSub}</span>
        </>
      )}
    </>
  );
}

function Rows({ view }: { view: StatsView }) {
  return <div className={styles.rows}>{view.rows.map(([label, value]) => <div key={label} className={styles.row}><span>{label}</span><b>{value}</b></div>)}</div>;
}

/** A duel's last five results and the rating's path: what the rows cannot say. */
function Form({ s }: { s: PlayerStats }) {
  const d = s.duel;
  return (
    <>
      {d.form.length > 0 && (
        <div className={styles.form} aria-label={'Last duels, newest first: ' + d.form.map(m => MARK[m].word).join(', ')}>
          <span>Last 5 duels</span>
          {d.form.map((m, i) => <i key={i} className={cx(styles.mark, styles['mark-' + m])} aria-hidden="true">{MARK[m].letter}</i>)}
        </div>
      )}
      {d.history.length > 1 && <Sparkline values={d.history} label={`Rating over your last ${d.history.length} ranked duels`} />}
    </>
  );
}

/** The place the player holds on the mode's board, and the way into it. */
function LeaderboardButton({ view, places, inset, onOpen }: { view: StatsView; places: Places; inset?: boolean; onOpen: () => void }) {
  const p = places.main;
  if (!p) return null;
  const now = `${placeText(p.entry, p.total)} ${view.placeLabel}`;
  const all = places.extra ? `${placeText(places.extra.entry, places.extra.total)} all time` : null;
  return (
    <button className={cx(styles.board, inset && styles.boardInset)} onClick={onOpen} aria-label={`${now}${all ? ', ' + all : ''}. Open the leaderboard`}>
      <span className={styles.boardText}>
        <b>{placeText(p.entry, p.total)}</b>
        <span>{view.placeLabel}{all ? ` · ${all}` : ''}</span>
      </span>
      <span className={styles.go}>Leaderboard ›</span>
    </button>
  );
}

/* Stats: everything the player has done, one mode at a time: nights, the voyage, Meteor Rush and the duel ladder,
   each with the place they hold and a way into that board. Read once (`useStats`); it never blocks play. */
export function StatsScreen({ userId, today, desk, onBoard, onSignIn, onBack }: Props) {
  const { stats, loading, error } = useStats(userId);
  const wide = useWide();
  const [mode, setMode] = useState<Mode>('nights');
  const week = useMyPlace('week', userId, { day: today });
  const allTime = useMyPlace('alltime', userId);
  const voyage = useMyPlace('voyage', userId);
  const rush = useMyPlace('rush', userId);
  const duel = useMyPlace('duel', userId);
  const placesOf: Record<Mode, Places> = { nights: { main: week, extra: allTime }, voyage: { main: voyage }, rush: { main: rush }, duel: { main: duel } };

  const note = !userId ? (
    <>
      <Note>Your numbers are kept for signed-in stargazers. Tonight’s skies are open to everyone.</Note>
      <Button block={!wide} onClick={onSignIn}>Sign in</Button>
    </>
  ) : error ? <Note tone="error">Couldn’t read your stats. {error}</Note>
    : !stats || loading ? <Note>Reading your logbook…</Note>
    : !hasPlayed(stats) ? <Note>Nothing charted yet. Chart a sky tonight, fly a voyage level or try a Meteor Rush, and your numbers will gather here.</Note>
    : null;

  const view = stats && statsView(stats, mode);
  const detail = stats && view && (
    <>
      <section className={styles.heroCard}><Hero view={view} /></section>
      {view.rows.length > 0 && (
        <section className={styles.rowsCard}>
          <Rows view={view} />
          {mode === 'duel' && <Form s={stats} />}
        </section>
      )}
      <LeaderboardButton view={view} places={placesOf[mode]} onOpen={() => onBoard(view.kinds)} />
    </>
  );

  if (wide) {
    return (
      <Page tone="night" wide>
        <div className={styles.desk}>
          <DeskHeader active="me" {...desk} />
          <TopBar title="Stats" onBack={onBack} backLabel="Me" />
          {note ?? (stats && view && (
            <div className={styles.deskGrid} role="region" aria-label="Your stats">
              <div className={styles.modeList} role="tablist" aria-label="Mode">
                {MODES.map(m => {
                  const v = statsView(stats, m.id);
                  return (
                    <button key={m.id} role="tab" aria-selected={m.id === mode} className={cx(styles.modeCard, m.id === mode && styles.modeOn)} onClick={() => setMode(m.id)}>
                      <Eyebrow tone={v.tone}>{v.eyebrow}</Eyebrow>
                      <span className={styles.modeLabel}>{v.heroLabel}</span>
                      <b className={styles.modeValue}>{v.hero}</b>
                    </button>
                  );
                })}
              </div>
              <section className={styles.detail}>
                <div className={styles.detailMain}>
                  <Hero view={view} />
                  {mode === 'duel' && !view.empty && <Form s={stats} />}
                </div>
                <div className={styles.detailSide}>
                  {view.rows.length > 0 && <Rows view={view} />}
                  <LeaderboardButton view={view} places={placesOf[mode]} inset onOpen={() => onBoard(view.kinds)} />
                </div>
              </section>
            </div>
          ))}
        </div>
      </Page>
    );
  }

  return (
    <Page tone="night">
      <TopBar title="Stats" onBack={onBack} backLabel="Me" />
      {note ?? (
        <>
          <Pills stretch label="Mode" items={MODES} value={mode} onChange={setMode} />
          <Scroll label="Your stats">{detail}</Scroll>
        </>
      )}
    </Page>
  );
}
