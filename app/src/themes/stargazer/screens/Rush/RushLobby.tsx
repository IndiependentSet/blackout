import { useSurvivalBoard } from '../../../../game/hooks/useSurvivalRanking';
import { SURVIVAL_LIMIT_MS, formatClock, type RunSummary } from '../../../../domain/survival';
import { Button } from '../../kit/Button';
import { Scroll } from '../../kit/Layout';
import { Eyebrow, Note, Page, TopBar } from '../../kit/Page';
import { plural } from '../../copy';
import { RushBoard } from './RushBoard';
import styles from './Rush.module.css';

/** how many runs the leaderboard page lists */
const LOBBY_ROWS = 20;

interface Props {
  userId: string | null;
  best: RunSummary | null;
  onStart: () => void;
  onBack: () => void;
}

/* Before a Rush: the leaderboard, and a button that starts the clock (a run's clock starts when it mounts). */
export function RushLobby({ userId, best, onStart, onBack }: Props) {
  const board = useSurvivalBoard(true, LOBBY_ROWS);
  return (
    <Page tone="rush">
      <TopBar title="Meteor Rush" onBack={onBack} backLabel="Tonight" />
      <Eyebrow tone="mars">Leaderboard</Eyebrow>
      <Note>
        Chart as many skies as you can in {formatClock(SURVIVAL_LIMIT_MS)}.
        {best && best.sites > 0 ? ` Your best is ${plural(best.sites, 'sky', 'skies')}.` : ''}
      </Note>
      <Scroll>
        {board.rows && board.rows.length > 0 ? <RushBoard rows={board.rows} userId={userId} />
          : <Note>{board.loading ? 'Reading the board…' : 'No runs yet. Be the first.'}</Note>}
      </Scroll>
      {!userId && <Note>Sign in to rank your runs.</Note>}
      <div className={styles.actions}>
        <Button block onClick={onStart}>Start rush</Button>
      </div>
    </Page>
  );
}
