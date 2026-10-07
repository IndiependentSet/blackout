import { useCallback, useEffect, useRef, useState } from 'react';
import { shareText } from '../domain/invoice';
import { totalScore } from '../domain/scoring';
import { isSiteIndex, LAST_SITE, SITE_COUNT, SITES } from '../domain/sites';
import { nearestInDirection } from '../domain/navigation';
import { isCleared } from '../domain/cover';
import type { HintTier } from '../domain/types';
import { useClipboard } from '../hooks/useClipboard';
import { useWindowKey } from '../hooks/useWindowKey';
import { recordClear } from '../services/repositories/siteClears';
import { cx, type StaffBadgeInfo } from '../ui';
import { audio } from './audio/AudioService';
import { Board, type BoardHandle } from './components/Board';
import { BoardPlaceholder } from './components/BoardPlaceholder';
import { ActionBar, HintBar, StatusRow } from './components/Controls';
import { FlashOverlay } from './components/FlashOverlay';
import { Invoice, KeyLegend, Procedure, RightRail, ShareCard } from './components/RightRail';
import { ScoreCard } from './components/ScoreCard';
import { Sidebar } from './components/Sidebar';
import { SitePlaque } from './components/SitePlaque';
import { bloom, flashScreen, pulseWeb } from './fx';
import { useScoreCard } from './hooks/useScoreCard';
import { keyAction } from './input/keymap';
import { HINT_KIND } from './state/hints';
import { SAVE_FAILED, skipSave, type SaveStatus } from './state/scoreCopy';
import { banner as bannerOf, hud as hudOf, pips as pipsOf, scoredCount, statusMessage } from './state/selectors';
import type { GameEvent } from './state/gameReducer';
import type { GameSession } from './useGameSession';
import styles from './GameScreen.module.css';

/** the fanfare and flash get this long before the score card slides in */
const CARD_DELAY_MS = 760;

interface Props {
  session: GameSession;
  /** the signed-in user, if any: only they have clears recorded */
  userId: string | null;
  badge: StaffBadgeInfo;
  onOpenAccount: () => void;
  onOpenWorkOrder: () => void;
}

export function GameScreen({ session, userId, badge, onOpenAccount, onOpenWorkOrder }: Props) {
  const { day, levels, level, state, dispatch, view } = session;
  const boardRef = useRef<BoardHandle>(null);
  const scoreCard = useScoreCard(audio);
  const { copied, copy } = useClipboard();
  const [save, setSave] = useState<SaveStatus | null>(null);

  const results = state.results;
  const idx = state.idx;

  /* ---- navigation ---- */
  const goTo = useCallback((i: number) => {
    if (isSiteIndex(i) && levels[i]) dispatch({ type: 'go', idx: i });
  }, [levels, dispatch]);
  const advance = () => { if (idx < LAST_SITE) goTo(idx + 1); };
  const next = () => { if (level && isCleared(level, state.placed)) advance(); };
  const cardNext = () => { scoreCard.close(); advance(); };

  /* ---- reacting to what happened on the board ---- */
  const handled = useRef(state.event ? state.event.seq : 0);   // an event from before this screen mounted is not ours to replay
  useEffect(() => {
    const e = state.event;
    if (!e || e.seq === handled.current) return;
    handled.current = e.seq;
    react(e);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts once per event, with the state it happened in
  }, [state.event]);

  function react(e: GameEvent) {
    switch (e.kind) {
      case 'hired':
      case 'cleared':
        if (!audio.crackle()) audio.chirp(e.count, true);
        audio.crash(e.gained);
        bloom(e.node);
        if (e.kind === 'cleared') {
          flashScreen(); audio.fanfare();
          scoreCard.openAfter(CARD_DELAY_MS, e.run, e.prevScore);
          saveClear(e);
        }
        break;
      case 'recalled': audio.chirp(e.count, false); break;
      case 'refused': audio.chirp(1, false); break;
      case 'reset': pulseWeb(); break;
      case 'entered': scoreCard.close(); break;
    }
  }

  function saveClear(e: Extract<GameEvent, { kind: 'cleared' }>) {
    const skip = skipSave(userId, session.onSchedule);
    if (skip || !userId) return setSave(skip);
    setSave({ kind: 'saving' });
    recordClear(userId, day, idx, e.run.used, e.run.par, e.run.stars).then(r => {
      if (r.ok) return setSave({ kind: 'saved' });
      setSave({ kind: 'error', message: r.error });
      dispatch({ type: 'notice', msg: SAVE_FAILED + r.error });
    });
  }

  /* ---- keyboard ---- */
  useWindowKey(e => {
    if (!level) return;
    if (scoreCard.card) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cardNext(); }
      else if (e.key === 'Escape') { e.preventDefault(); scoreCard.close(); }
      return;
    }
    dispatch({ type: 'keyboard' });
    const a = keyAction(e.key);
    if (!a) return;
    e.preventDefault();
    switch (a.type) {
      case 'recall': return dispatch({ type: 'reset' });
      case 'next': return next();
      case 'fit': return boardRef.current?.fit();
      case 'expand': return view.toggleExpanded();
      case 'dim': return view.toggleDim();
      case 'zoom': return boardRef.current?.zoomBy(a.by);
      case 'consult': return dispatch({ type: 'consult', tier: a.tier, lv: level });
      case 'activate': return dispatch({ type: 'tap', node: state.focus, lv: level });
      case 'move': {
        const node = nearestInDirection(level.nodes, state.focus, a.dir);
        if (node < 0) return;
        dispatch({ type: 'focus', node });
        boardRef.current?.follow(node);
      }
    }
  });

  /* ---- what to show ---- */
  const hud = hudOf(level, state.placed);
  const banner = bannerOf(level, state.placed, idx);
  const msg = statusMessage(level, state.placed, state.msg);
  const activeTier = (state.hint ? ([1, 2, 3] as HintTier[]).find(t => HINT_KIND[t] === state.hint!.kind) : null) ?? null;
  const siteName = SITES[idx];
  const invoiceText = shareText(day, results);

  return (
    <>
      <div className={styles.page}>
        <div className={styles.cols}>
          <Sidebar hidden={view.expanded} badge={badge} pips={pipsOf(results, levels, idx)}
            onOpenAccount={onOpenAccount} onGoSite={goTo} onOpenWorkOrder={onOpenWorkOrder} />

          <main className={cx(styles.main, view.expanded && styles.wide)}>
            <SitePlaque siteNo={idx + 1} level={level} name={siteName} best={results[idx]} />
            {level ? (
              <Board ref={boardRef} level={level} siteIdx={idx} placed={state.placed} hint={state.hint}
                focus={state.focus} kbd={state.kbd} dim={view.dim} expanded={view.expanded}
                onTapNode={node => dispatch({ type: 'tap', node, lv: level })}
                onToggleExpand={view.toggleExpanded} onToggleDim={view.toggleDim} />
            ) : <BoardPlaceholder />}
            <StatusRow hud={hud} msg={msg} />
            <HintBar active={activeTier} onConsult={tier => level && dispatch({ type: 'consult', tier, lv: level })} />
            <ActionBar banner={banner} onRecall={() => dispatch({ type: 'reset' })} onNext={next} />
          </main>

          <RightRail hidden={view.expanded}>
            <Procedure />
            <Invoice total={totalScore(results)} scored={scoredCount(results) + '/' + SITE_COUNT + ' SCORED'} par={level ? level.k : null} />
            {scoredCount(results) === SITE_COUNT && (
              <ShareCard text={invoiceText} copied={copied} onCopy={() => copy(invoiceText)} />
            )}
            <KeyLegend />
          </RightRail>
        </div>
      </div>

      {scoreCard.card && (
        <ScoreCard state={scoreCard.card} day={day} siteNo={idx + 1} siteName={siteName}
          nextLabel={banner.nextLabel} save={save}
          onReview={scoreCard.close} onNext={cardNext} />
      )}
      <FlashOverlay />
    </>
  );
}
