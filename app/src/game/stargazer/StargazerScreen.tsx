import { useCallback, useEffect, useRef, useState } from 'react';
import { isCleared } from '../../domain/cover';
import { nearestInDirection } from '../../domain/navigation';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useWindowKey } from '../../hooks/useWindowKey';
import { cx } from '../../ui';
import { audio } from '../audio/AudioService';
import { useClearSaver } from '../hooks/useClearSaver';
import { keyAction } from '../input/keymap';
import { REFUSED_MSG, isLastSite, type GameEvent } from '../state/gameReducer';
import type { PlaySession } from '../session';
import { SAVE_FAILED } from '../state/scoreCopy';
import { SkyBoard } from './SkyBoard';
import { BackIcon, LitCount, ParPill, ResetIcon, SkyDots, SkyList, Starfield, Telescope } from './StargazerParts';
import { SCOPE_TIER, activeScope, darkLabel, scopeForKey, skyEntries, skyMessage, type Scope } from './sky';
import '../../styles/stargazer.css';
import styles from './Stargazer.module.css';

const OUT_OF_POWER = 'The telescope is out of power. Dim a star first.';
const WIDE = '(min-width: 1024px)';

interface Props {
  session: PlaySession;
  userId: string | null;
  onOpenHub: () => void;
  /** back to the CATASTROPHE INC. board, same levels and progress */
  onSwitchSkin: () => void;
}

/* Trial look (Stargazer.dc.html, 1c phone / 1n desktop): the same daily week, reducer, hints and saving as
   GameScreen, drawn as a night sky. */
export function StargazerScreen({ session, userId, onOpenHub, onSwitchSkin }: Props) {
  const { level, levels, state, dispatch, set, features } = session;
  const idx = state.idx;
  const wide = useMediaQuery(WIDE);
  const onSaveError = useCallback((error: string) => dispatch({ type: 'notice', msg: SAVE_FAILED + error }), [dispatch]);
  const { saveClear } = useClearSaver(userId, session.save, onSaveError, session.onSchedule ?? true);

  /* the telescope view picked for the board exactly as it stands: lighting or dimming a star puts it away */
  const boardKey = idx + ':' + state.placed.join(',');
  const [picked, setPicked] = useState<{ scope: Scope; key: string } | null>(null);
  const scope = activeScope(picked && picked.key === boardKey ? picked.scope : null, state.hint);

  const handled = useRef(state.event ? state.event.seq : 0);
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
      case 'cleared': audio.chirp(e.count, true); audio.fanfare(); saveClear(idx, e.run, e.consulted); break;
      case 'recalled': audio.chirp(e.count, false); break;
      case 'refused': audio.chirp(1, false); break;
    }
  }

  const goTo = (i: number) => { if (i >= 0 && i < set.count && levels[i]) dispatch({ type: 'go', idx: i }); };
  const cleared = !!level && isCleared(level, state.placed);
  const chart = () => { if (!cleared) return; if (isLastSite(idx, set.count)) onOpenHub(); else goTo(idx + 1); };
  const reset = () => dispatch({ type: 'reset' });
  const pointScope = (s: Scope) => {
    if (!level) return;
    const tier = SCOPE_TIER[s];
    if (tier) dispatch({ type: 'consult', tier, lv: level });
    setPicked({ scope: s, key: boardKey });
  };

  useWindowKey(e => {
    if (!level) return;
    dispatch({ type: 'keyboard' });
    const a = keyAction(e.key);
    if (!a) return;
    switch (a.type) {
      case 'recall': e.preventDefault(); return reset();
      case 'next': e.preventDefault(); return chart();
      case 'consult': if (features.hints) { e.preventDefault(); pointScope(scopeForKey(a.tier)); } return;
      case 'activate': e.preventDefault(); return dispatch({ type: 'tap', node: state.focus, lv: level });
      case 'move': {
        e.preventDefault();
        const node = nearestInDirection(level.nodes, state.focus, a.dir);
        if (node >= 0) dispatch({ type: 'focus', node });
        return;
      }
    }
  });

  /* ---- what to show ---- */
  const skies = skyEntries(state.results, idx);
  const notice = state.msg === REFUSED_MSG ? OUT_OF_POWER : state.msg.startsWith(SAVE_FAILED) ? state.msg : '';
  const msg = skyMessage(level, state.placed, state.hint, scope, notice);
  const title = `Sky ${idx + 1} of ${set.count}`;
  const telescope = features.hints && <Telescope wide={wide} active={scope} onUse={pointScope} />;
  const board = level ? (
    <SkyBoard level={level} placed={state.placed} sweep={scope === 'sweep'}
      ring={scope === 'spot' && state.hint?.kind === 'reveal' ? state.hint.node : null}
      focus={state.kbd ? state.focus : null}
      onTapStar={node => dispatch({ type: 'tap', node, lv: level })} />
  ) : <div className={styles.waiting}>Scanning the sky…</div>;
  const chartButton = <button className={styles.primary} disabled={!cleared} onClick={chart}>Chart this sky</button>;
  const switchLink = <button className={styles.switch} onClick={onSwitchSkin}>Back to the classic look</button>;

  if (wide) {
    return (
      <div className={cx('sg', styles.page, styles.pageWide)}>
        <Starfield wide />
        <div className={styles.grid}>
          <nav className={styles.left}>
            <div className={styles.leftHead}>
              <button className={styles.icon} aria-label="Back" onClick={onOpenHub}><BackIcon /></button>
              <div className={styles.heading}>Tonight</div>
            </div>
            <SkyList skies={skies} canOpen={i => !!levels[i]} onOpen={goTo} />
            <div className={styles.leftFoot}>{switchLink}</div>
          </nav>
          <main className={styles.boardWide}>{board}</main>
          <aside className={styles.right}>
            <div className={styles.rightHead}><div className={styles.eyebrow}>{title}</div>{level && <ParPill par={level.k} />}</div>
            <LitCount lit={state.placed.length} label={darkLabel(level, state.placed)} wide />
            <div className={cx(styles.msg, styles.msgWide)} role="status">{msg}</div>
            {telescope}
            <div className={styles.actions}>
              <button className={styles.ghost} onClick={reset}>Dim all</button>
              {chartButton}
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className={cx('sg', styles.page)}>
      <Starfield wide={false} />
      <div className={styles.col}>
        <div className={styles.top}>
          <button className={styles.icon} aria-label="Back" onClick={onOpenHub}><BackIcon /></button>
          <div className={styles.titleBlock}><div className={styles.title}>{title}</div><SkyDots skies={skies} /></div>
          <button className={styles.icon} aria-label="Dim all" onClick={reset}><ResetIcon /></button>
        </div>
        <div className={styles.countRow}>
          <LitCount lit={state.placed.length} label={darkLabel(level, state.placed)} wide={false} />
          {level && <ParPill par={level.k} />}
        </div>
        <div className={styles.board}>{board}</div>
        {telescope}
        <div className={styles.msg} role="status">{msg}</div>
        {chartButton}
        {switchLink}
      </div>
    </div>
  );
}
