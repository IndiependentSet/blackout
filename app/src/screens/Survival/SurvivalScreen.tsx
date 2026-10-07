import { useCallback, useEffect, useRef, useState } from 'react';
import { betterRun, mergeBest, type RunSummary } from '../../domain/survival';
import { GameScreen } from '../../game/GameScreen';
import { useServerBest, useSurvivalBoard } from '../../game/hooks/useSurvivalRanking';
import { useSurvivalSession } from '../../game/useSurvivalSession';
import type { StaffBadgeInfo } from '../../ui';
import { SurvivalHud } from './SurvivalHud';
import { SurvivalSummary } from './SurvivalSummary';

interface Props {
  userId: string | null;
  badge: StaffBadgeInfo;
  /** the best run so far this session, kept above this screen so it outlives it */
  best: RunSummary | null;
  /** a run has ended, by the clock or by walking away from it */
  onFinish: (summary: RunSummary) => void;
  onOpenAccount: () => void;
  onOpenHub: () => void;
}

function SurvivalRun({ userId, badge, best, onFinish, onOpenAccount, onOpenHub, onAgain }: Props & { onAgain: () => void }) {
  const session = useSurvivalSession(undefined, undefined, userId);
  const { over, summary, remainingMs, recording, recorded } = session;
  /* the record to beat: this session's best before the run, or the server's if that is better. The server's is read once, at
     the start, so the run itself never counts against it. */
  const [sessionBefore] = useState(best);
  const before = mergeBest(sessionBefore, useServerBest(userId));
  const board = useSurvivalBoard(over && recorded);

  const reported = useRef(false);
  const finish = useCallback(() => {
    if (reported.current || summary.sites === 0) return;
    reported.current = true;
    onFinish(summary);
  }, [summary, onFinish]);
  useEffect(() => { if (over) finish(); }, [over, finish]);

  const leave = () => { finish(); onOpenHub(); };
  const isRecord = summary.sites > 0 && betterRun(before, summary) === summary;

  return (
    <>
      <GameScreen session={session} userId={userId} badge={badge} locked={over}
        onOpenAccount={onOpenAccount} onOpenHub={leave}
        hud={<SurvivalHud remainingMs={remainingMs} summary={summary} signedIn={!!userId} recording={recording} />} />
      {over && (
        <SurvivalSummary summary={summary} before={before} isRecord={isRecord} signedIn={!!userId}
          recording={recording} board={board.rows} userId={userId} onAgain={onAgain} onOpenHub={leave} />
      )}
    </>
  );
}

/* Survival: as many sites as the clock allows. Each run is its own mount (and its own run seed), so PLAY AGAIN is a new key. */
export function SurvivalScreen(props: Props) {
  const [run, setRun] = useState(0);
  return <SurvivalRun key={run} {...props} onAgain={() => setRun(n => n + 1)} />;
}
