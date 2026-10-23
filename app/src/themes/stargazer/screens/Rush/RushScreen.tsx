import { useCallback, useEffect, useRef, useState } from 'react';
import { coveredEdges } from '../../../../domain/cover';
import { SURVIVAL_LIMIT_MS, betterRun, formatClock, mergeBest, type RunSummary } from '../../../../domain/survival';
import { usePoolPublished } from '../../../../game/hooks/usePoolPublished';
import { useServerBest } from '../../../../game/hooks/useSurvivalRanking';
import { useSurvivalSession } from '../../../../game/useSurvivalSession';
import { Button } from '../../kit/Button';
import { CloseIcon } from '../../kit/icons';
import { Note, Page, TopBar } from '../../kit/Page';
import { cx } from '../../kit/cx';
import { SkyPlay } from '../../play/SkyPlay';
import { NO_SKIES, plural } from '../../copy';
import { RushLobby } from './RushLobby';
import { RushSummary } from './RushSummary';
import styles from './Rush.module.css';

/** the ring turns urgent for the last half minute */
const LOW_MS = 30_000;
const RING = 264;   // the ring's circumference, 2π × 42

interface Props {
  userId: string | null;
  /** this session's best run, kept above the screen */
  best: RunSummary | null;
  onFinish: (run: RunSummary) => void;
  onBack: () => void;
  onSignIn: () => void;
}

function RushTop({ remainingMs, summary, best, onQuit }: { remainingMs: number; summary: RunSummary; best: RunSummary | null; onQuit: () => void }) {
  const left = Math.max(0, remainingMs) / SURVIVAL_LIMIT_MS;
  return (
    <>
      <div className={styles.top}>
        <button className={styles.icon} aria-label="Quit" onClick={onQuit}><CloseIcon /></button>
        <div className={styles.title}>Meteor Rush</div>
        <div className={styles.spacer} />
      </div>
      <div className={styles.hud}>
        <div className={styles.ring}>
          <svg viewBox="0 0 100 100" width="96" height="96" aria-hidden="true">
            <circle cx="50" cy="50" r="42" className={styles.ringTrack} />
            <circle cx="50" cy="50" r="42" className={cx(styles.ringFill, remainingMs <= LOW_MS && styles.ringLow)}
              strokeDasharray={RING} strokeDashoffset={RING * (1 - left)} />
          </svg>
          <div className={styles.clock} role="timer" aria-label="time until dawn">{formatClock(remainingMs)}</div>
        </div>
        <div className={styles.tally}>
          <div className={styles.skies}>{summary.sites} <span>{summary.sites === 1 ? 'sky' : 'skies'}</span></div>
          <div className={styles.chips}>
            <span className={styles.chipMars}>×{summary.perfect} at par</span>
            {best && best.sites > 0 && <span className={styles.chip}>Best {best.sites}</span>}
          </div>
        </div>
      </div>
    </>
  );
}

function RushRun({ userId, best, onFinish, onBack, onSignIn, onAgain }: Props & { onAgain: () => void }) {
  const session = useSurvivalSession(undefined, undefined, userId);
  const { over, summary, remainingMs, recording, recorded, level, state } = session;
  const [sessionBefore] = useState(best);
  const before = mergeBest(sessionBefore, useServerBest(userId));

  const reported = useRef(false);
  const finish = useCallback(() => {
    if (reported.current || summary.sites === 0) return;
    reported.current = true;
    onFinish(summary);
  }, [summary, onFinish]);
  useEffect(() => { if (over) finish(); }, [over, finish]);
  const leave = () => { finish(); onBack(); };

  if (over) {
    return (
      <RushSummary summary={summary} before={before} isRecord={summary.sites > 0 && betterRun(before, summary) === summary}
        signedIn={!!userId} unsaved={recording === 'unsaved'} recorded={recorded} userId={userId} onSignIn={onSignIn} onAgain={onAgain} onBack={leave} />
    );
  }

  const dark = level ? level.edges.length - coveredEdges(level, state.placed).size : 0;
  const status = level ? `${plural(dark, 'line')} still dark. Chart as many skies as you can before dawn.` : 'The first sky is rising…';
  return (
    <SkyPlay session={session} userId={userId} tone="rush" title="Meteor Rush" onBack={leave} primary={null} status={status}
      top={<RushTop remainingMs={remainingMs} summary={summary} best={before} onQuit={leave} />}
      footer={!userId ? <div className={styles.foot}>Sign in to rank your runs.</div> : recording === 'unsaved' ? <div className={styles.foot}>Not saved: playing on this device only.</div> : null} />
  );
}

/* Meteor Rush (1g): survival. The leaderboard first, then as many skies as the clock allows; each run is its own mount,
   so "Again" is a new key (and goes straight into the next run). */
export function RushScreen(props: Props) {
  const [run, setRun] = useState(0);
  const [started, setStarted] = useState(false);
  const pool = usePoolPublished('survival');
  if (pool === 'empty') {
    return (
      <Page tone="rush">
        <TopBar title="Meteor Rush" onBack={props.onBack} backLabel="Tonight" />
        <Note>{NO_SKIES}</Note>
        <Button block onClick={props.onBack}>Back to tonight</Button>
      </Page>
    );
  }
  if (!started) return <RushLobby userId={props.userId} best={props.best} onStart={() => setStarted(true)} onBack={props.onBack} onSignIn={props.onSignIn} />;
  return <RushRun key={run} {...props} onAgain={() => setRun(n => n + 1)} />;
}
