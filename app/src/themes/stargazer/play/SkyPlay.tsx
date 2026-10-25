import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { isCleared } from '../../../domain/cover';
import { nearestInDirection } from '../../../domain/navigation';
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
import { useWide } from '../kit/useWide';
import { SkyBoard } from './SkyBoard';
import { SkyStage } from './SkyStage';
import type { Pace } from './slew';
import { skyLayout } from './warp';
import { LitCount, ParPill, SkyDots, SkyList, Telescope } from './StargazerParts';
import { SCOPE_TIER, activeScope, darkLabel, scopeForKey, skyMessage, type Scope, type SkyEntry } from './sky';
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
  const onSaveError = useCallback((error: string) => session.dispatch({ type: 'notice', msg: SAVE_FAILED + error }), [session]);
  const { saveClear } = useClearSaver(userId, session.save, onSaveError, session.onSchedule ?? true);

  /* the telescope view picked for the board exactly as it stands: lighting or dimming a star puts it away */
  const boardKey = state.idx + ':' + state.placed.join(',');
  const [picked, setPicked] = useState<{ scope: Scope; key: string } | null>(null);
  const scope = activeScope(picked && picked.key === boardKey ? picked.scope : null, state.hint);

  const handled = useRef(state.event ? state.event.seq : 0);   // an event from before this screen mounted is not ours
  useEffect(() => {
    const e = state.event;
    if (!e || e.seq === handled.current) return;
    handled.current = e.seq;
    react(e);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts once per event, with the state it happened in
  }, [state.event]);

  function react(e: GameEvent) {
    switch (e.kind) {
      case 'hired': audio.chirp(e.count, true); break;
      case 'cleared': audio.chirp(e.count, true); audio.fanfare(); saveClear(state.idx, e.run, e.consulted); break;
      case 'recalled': audio.chirp(e.count, false); break;
      case 'refused': audio.chirp(1, false); break;
    }
    onEvent?.(e);
  }

  const cleared = !!level && isCleared(level, state.placed);
  const act = () => { if (primary && !primary.disabled && primary.onClick) primary.onClick(); };
  const reset = () => dispatch({ type: 'reset' });
  const point = (s: Scope) => {
    if (!level || locked) return;
    const tier = SCOPE_TIER[s];
    if (tier) dispatch({ type: 'consult', tier, lv: level });
    setPicked({ scope: s, key: boardKey });
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
        /* by where the stars are drawn, not their lattice cells: a tilted sky turns its rows */
        const node = nearestInDirection(skyLayout(level).at, state.focus, a.dir);
        if (node >= 0) dispatch({ type: 'focus', node });
        return;
      }
    }
  });

  /* ---- what to show ---- */
  const notice = state.msg === REFUSED_MSG ? OUT_OF_POWER : state.msg.startsWith(SAVE_FAILED) ? state.msg : '';
  const msg = notice || (scope ? skyMessage(level, state.placed, state.hint, scope, '') : status || skyMessage(level, state.placed, state.hint, null, ''));
  const telescope = features.hints && <Telescope wide={wide} active={scope} onUse={point} />;
  /* which sky of the mode is up: a new one is reached by slewing the telescope (SkyStage) */
  const slot = (session.siteOffset ?? 0) + state.idx;
  const board = (
    <SkyStage level={level} placed={state.placed} slot={slot} pace={pace} wide={wide}>
      {level ? (
        <SkyBoard level={level} placed={state.placed} sweep={scope === 'sweep'}
          ring={scope === 'spot' && state.hint?.kind === 'reveal' ? state.hint.node : null}
          focus={state.kbd ? state.focus : null}
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

  return (
    <DeskPage active={active} tone={tone} className={styles.col}>
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
      <div className={styles.board}>{board}</div>
      {telescope}
      <div className={styles.msg} role="status">{msg}</div>
      {button}
      {footer}
    </DeskPage>
  );
}
