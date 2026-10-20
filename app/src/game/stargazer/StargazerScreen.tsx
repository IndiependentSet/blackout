import { useCallback, useEffect, useRef } from 'react';
import { isCleared } from '../../domain/cover';
import { cx } from '../../ui';
import { audio } from '../audio/AudioService';
import { useClearSaver } from '../hooks/useClearSaver';
import { REFUSED_MSG, isLastSite, type GameEvent } from '../state/gameReducer';
import type { PlaySession } from '../session';
import { SAVE_FAILED } from '../state/scoreCopy';
import { SkyBoard } from './SkyBoard';
import { skyPips, skyStatus } from './sky';
import '../../styles/stargazer.css';
import styles from './Stargazer.module.css';

const OUT_OF_POWER = 'The telescope is out of power. Dim a star first.';

interface Props {
  session: PlaySession;
  userId: string | null;
  onOpenHub: () => void;
  /** back to the CATASTROPHE INC. board, same levels and progress */
  onSwitchSkin: () => void;
}

/* Trial look (Rebrand Proposals 4c): the same daily week, reducer and saving as GameScreen, drawn as a night sky. */
export function StargazerScreen({ session, userId, onOpenHub, onSwitchSkin }: Props) {
  const { level, levels, state, dispatch, set } = session;
  const idx = state.idx;
  const onSaveError = useCallback((error: string) => dispatch({ type: 'notice', msg: SAVE_FAILED + error }), [dispatch]);
  const { saveClear } = useClearSaver(userId, session.save, onSaveError, session.onSchedule ?? true);

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
  const last = isLastSite(idx, set.count);
  const note = state.msg === REFUSED_MSG ? OUT_OF_POWER : state.msg;

  return (
    <div className={cx('sg', styles.page)}>
      <div className={styles.col}>
        <div className={styles.top}>
          <button className={styles.icon} aria-label="Back" onClick={onOpenHub}>
            <svg viewBox="0 0 24 24" width="22" height="22"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <div className={styles.title}>Sky {idx + 1} of {set.count}</div>
          <button className={styles.icon} aria-label="Reset" onClick={() => dispatch({ type: 'reset' })}>
            <svg viewBox="0 0 24 24" width="22" height="22"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
          </button>
        </div>

        <div className={styles.countRow}>
          <div className={styles.count}>
            <div className={styles.big}>{state.placed.length}</div>
            <div className={styles.countText}>{state.placed.length === 1 ? 'star' : 'stars'} lit<br />{skyStatus(level, state.placed)}</div>
          </div>
          {level && <span className={styles.par}>Par {level.k}</span>}
        </div>

        <div className={styles.board}>
          {level
            ? <SkyBoard level={level} placed={state.placed} onTapStar={node => dispatch({ type: 'tap', node, lv: level })} />
            : <div className={styles.waiting}>Scanning the sky…</div>}
        </div>

        <div className={styles.note} role="status">{note}</div>

        <div className={styles.pips}>
          {skyPips(state.results, idx).map((p, i) => (
            <button key={i} className={cx(styles.pip, styles[p])} aria-label={'Sky ' + (i + 1)} disabled={!levels[i]} onClick={() => goTo(i)} />
          ))}
        </div>

        {cleared && last
          ? <button className={styles.primary} onClick={onOpenHub}>Night complete</button>
          : <button className={styles.primary} disabled={!cleared} onClick={() => goTo(idx + 1)}>Next sky</button>}
        <button className={styles.switch} onClick={onSwitchSkin}>Back to the classic look</button>
      </div>
    </div>
  );
}
