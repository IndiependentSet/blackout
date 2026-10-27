import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { isCleared } from '../../../domain/cover';
import { hintDarkMatching } from '../../../domain/hints';
import { nearestInDirection } from '../../../domain/navigation';
import { useBoxSize } from '../../../hooks/useBoxSize';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useWindowKey } from '../../../hooks/useWindowKey';
import { audio } from '../../../game/audio/AudioService';
import { useClearSaver } from '../../../game/hooks/useClearSaver';
import { keyAction } from '../../../game/input/keymap';
import { REFUSED_MSG, type GameEvent } from '../../../game/state/gameReducer';
import type { PlaySession } from '../../../game/session';
import { SAVE_FAILED } from '../../../game/state/scoreCopy';
import { Button } from '../kit/Button';
import { cx } from '../kit/cx';
import { BackIcon, ResetIcon } from '../kit/icons';
import { DeskHeader, type DeskDest } from '../kit/DeskHeader';
import { useDesk } from '../kit/DeskContext';
import { DeskPage } from '../kit/DeskPage';
import { Page, type Tone } from '../kit/Page';
import { UPRIGHT_PHONE, useWide } from '../kit/useWide';
import { SkyBoard } from './SkyBoard';
import { SkyStage } from './SkyStage';
import type { Pace } from './slew';
import { LitCount, ParPill, SkyDots, SkyList, Telescope } from './StargazerParts';
import { BIG_SKY, SCOPE_TIER, activeScope, darkLabel, scopeForKey, skyMessage, skyPoints, skyProgress, type Scope, type SkyEntry } from './sky';
import styles from './Stargazer.module.css';

const OUT_OF_POWER = 'The telescope is out of power. Dim a star first.';

export interface PlayAction { label: string; onClick?: () => void; disabled?: boolean }

interface Props {
  session: PlaySession;
  userId: string | null;
  /** taps and keys are ignored (before a duel starts, once Rush's clock is out) */
  locked?: boolean;
  tone?: Tone;
  /** the place of the desktop header this mode belongs to */
  active: DeskDest;
  /** "Sky 3 of 7", "Mars · level 15" */
  title: string;
  onBack: () => void;
  backLabel?: string;
  /** replaces the phone header and the big count with a mode's own (Rush's clock, the duel's two players) */
  top?: ReactNode;
  /** tonight's skies: dots under the title on a phone, a list down the left on desktop */
  skies?: { entries: SkyEntry[]; heading: string; canOpen: (i: number) => boolean; onOpen: (i: number) => void };
  /** the big button under the board; null leaves it out (Rush moves on by itself) */
  primary: PlayAction | null;
  /** what the mode wants said under the board when nothing more pressing is (the telescope, a notice) */
  status?: string | null;
  /** anything under the button (the duel's forfeit) */
  footer?: ReactNode;
  /** told about every board event once, after the sound and the save */
  onEvent?: (e: GameEvent) => void;
  /** how fast the telescope slews to the next sky: Meteor Rush's clock is running, so it hurries */
  pace?: Pace;
}

/* Stargazer's board, in every mode (1c phone, 1n desktop): the sky, the lit count against par, the telescope when the
   mode allows hints, a message and one action. The rules, the hints and saving are the game's own: the reducer in
   the session, and `session.save` for a clear (the daily week, a voyage level, a duel's cover). */
export function SkyPlay({ session, userId, locked = false, tone = 'night', active, title, onBack, backLabel = 'Back', top, skies, primary, status, footer, onEvent, pace = 'full' }: Props) {
  const { level, state, features } = session;
  const dispatch = useCallback<typeof session.dispatch>(a => { if (!locked || a.type === 'keyboard') session.dispatch(a); }, [locked, session]);
  const wide = useWide() && !top;
  const desk = useDesk();
  /* the board's size: a sky turns and its stars grow to fit it, and the arrow keys follow what's drawn */
  const { setEl: measure, box } = useBoxSize<HTMLDivElement>();
  const onSaveError = useCallback((error: string) => session.dispatch({ type: 'notice', msg: SAVE_FAILED + error }), [session]);
  const { saveClear } = useClearSaver(userId, session.save, onSaveError, session.onSchedule ?? true);

  /* the telescope view picked: Spot and Sweep for the board exactly as it stands (lighting or dimming a star puts them
     away), Count for the whole sky (it recounts what's left as stars change, until pressed again, a reset or a new sky) */
  const slot = (session.siteOffset ?? 0) + state.idx;
  const boardKey = slot + ':' + state.placed.join(',');
  const [picked, setPicked] = useState<{ scope: Scope; key: string } | null>(null);
  const keyFor = (s: Scope) => (s === 'count' ? String(slot) : boardKey);
  const scope = activeScope(picked && picked.key === keyFor(picked.scope) ? picked.scope : null, state.hint);
  const counted = useMemo(() => (scope === 'count' && level ? hintDarkMatching(level, state.placed) : null),
    [scope, level, state.placed]);

  const handled = useRef(state.event ? state.event.seq : 0);   // an event from before this screen mounted is not ours
  useEffect(() => {
    const e = state.event;
    if (!e || e.seq === handled.current) return;
    handled.current = e.seq;
    react(e);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts once per event, with the state it happened in
  }, [state.event]);

  /* how much of the figure glows, and how much did before this commit: a dimmed star's note slides from one to the
     other. Updated after the event above has read it. */
  const progress = skyProgress(level, state.placed);
  const shown = useRef(progress);
  useEffect(() => { shown.current = progress; }, [progress]);

  function react(e: GameEvent) {
    switch (e.kind) {
      case 'hired': audio.twinkle(progress); break;
      case 'cleared': audio.constellation(); saveClear(state.idx, e.run, e.consulted); break;
      case 'recalled': audio.fade(shown.current, progress); break;
      case 'refused': audio.fizzle(); break;
    }
    onEvent?.(e);
  }

  const cleared = !!level && isCleared(level, state.placed);
  const act = () => { if (primary && !primary.disabled && primary.onClick) primary.onClick(); };
  const reset = () => { dispatch({ type: 'reset' }); if (!locked) setPicked(null); };
  const point = (s: Scope) => {
    if (!level || locked) return;
    if (s === 'count' && scope === 'count') { setPicked(null); return; }   // Count pressed again puts it away
    const tier = SCOPE_TIER[s];
    if (tier) dispatch({ type: 'consult', tier, lv: level });
    setPicked({ scope: s, key: keyFor(s) });
  };

  useWindowKey(e => {
    if (!level) return;
    if (e.target instanceof HTMLInputElement) return;
    dispatch({ type: 'keyboard' });
    const a = keyAction(e.key);
    if (!a) return;
    switch (a.type) {
      case 'recall': e.preventDefault(); return reset();
      case 'next': e.preventDefault(); return act();
      case 'consult': if (features.hints) { e.preventDefault(); point(scopeForKey(a.tier)); } return;
      case 'activate':
        if (e.target instanceof HTMLButtonElement) return;   // Enter on a focused button presses that button
        e.preventDefault(); return dispatch({ type: 'tap', node: state.focus, lv: level });
      case 'move': {
        e.preventDefault();
        /* by where the stars are drawn, not their lattice cells: a tilted or turned sky turns its rows */
        const at = skyPoints(level, { box, tight: true }).at.map(p => ({ c: p.x, r: p.y }));
        const node = nearestInDirection(at, state.focus, a.dir);
        if (node >= 0) dispatch({ type: 'focus', node });
        return;
      }
    }
  });

  /* ---- what to show ---- */
  /* a big sky on a phone: the column around it tightens so the board gets the room, and upright, the first message
     says a sideways phone shows it bigger */
  const compact = !!level && level.nodes.length >= BIG_SKY;
  const upright = useMediaQuery(UPRIGHT_PHONE);
  const notice = state.msg === REFUSED_MSG ? OUT_OF_POWER : state.msg.startsWith(SAVE_FAILED) ? state.msg : '';
  const msg = notice || (scope ? skyMessage(level, state.placed, state.hint, scope, '', { counted })
    : status || skyMessage(level, state.placed, state.hint, null, '', { turnHint: upright && compact }));
  const telescope = features.hints && <Telescope wide={wide} active={scope} onUse={point} />;
  /* which sky of the mode is up (`slot`, above): a new one is reached by slewing the telescope (SkyStage) */
  const board = (
    <SkyStage level={level} placed={state.placed} slot={slot} pace={pace} wide={wide} measure={measure} box={box}>
      {level ? (
        <SkyBoard level={level} placed={state.placed} sweep={scope === 'sweep'} counted={counted}
          ring={scope === 'spot' && state.hint?.kind === 'reveal' ? state.hint.node : null}
          focus={state.kbd ? state.focus : null} box={box}
          onTapStar={node => dispatch({ type: 'tap', node, lv: level })} />
      ) : <div className={styles.waiting}>Scanning the sky…</div>}
    </SkyStage>
  );
  const button = primary && (
    <Button block disabled={primary.disabled ?? !cleared} onClick={act}>{primary.label}</Button>
  );

  if (wide) {
    return (
      <Page tone="deep" wide>
        <div className={styles.deskFrame}>
        {desk && <div className={styles.deskHead}><DeskHeader active={active} {...desk} /></div>}
        <div className={styles.grid}>
          <nav className={styles.left}>
            <div className={styles.leftHead}>
              <button className={styles.icon} aria-label={backLabel} onClick={onBack}><BackIcon /></button>
              <div className={styles.heading}>{skies ? skies.heading : title}</div>
            </div>
            {skies && <SkyList skies={skies.entries} canOpen={skies.canOpen} onOpen={skies.onOpen} />}
          </nav>
          <main className={styles.boardWide}>{board}</main>
          <aside className={styles.right}>
            <div className={styles.rightHead}><div className={styles.eyebrow}>{title}</div>{level && <ParPill par={level.k} />}</div>
            <LitCount lit={state.placed.length} label={darkLabel(level, state.placed)} wide />
            <div className={cx(styles.msg, styles.msgWide)} role="status">{msg}</div>
            {telescope}
            <div className={styles.actions}>
              <Button kind="outline" onClick={reset} className={styles.dimAll}>Dim all</Button>
              {button}
            </div>
            {footer}
          </aside>
        </div>
        </div>
      </Page>
    );
  }

  /* One tree upright and sideways, so turning the phone never remounts the board (lit stars, the loupe and a slew
     carry on): the CSS lays it out. Upright, the side group dissolves into the column and the head goes above the
     board; on a sideways phone the board takes the height and the side group is a panel beside it. */
  return (
    <DeskPage active={active} tone={tone} className={cx(styles.col, compact && styles.compact)}>
      <div className={styles.board}>{board}</div>
      <div className={styles.side}>
        <div className={styles.head}>
          {top ?? (
            <>
              <div className={styles.top}>
                <button className={styles.icon} aria-label={backLabel} onClick={onBack}><BackIcon /></button>
                <div className={styles.titleBlock}><div className={styles.title}>{title}</div>{skies && <SkyDots skies={skies.entries} />}</div>
                <button className={styles.icon} aria-label="Dim all" onClick={reset}><ResetIcon /></button>
              </div>
              <div className={styles.countRow}>
                <LitCount lit={state.placed.length} label={darkLabel(level, state.placed)} wide={false} />
                {level && <ParPill par={level.k} />}
              </div>
            </>
          )}
        </div>
        {telescope}
        <div className={styles.msg} role="status">{msg}</div>
        {button && <div className={styles.go}>{button}</div>}
        {footer}
      </div>
    </DeskPage>
  );
}
