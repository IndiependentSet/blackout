import { SURVIVAL_LIMIT_MS, formatClock, type RunSummary } from '../../../../domain/survival';
import { Button } from '../../kit/Button';
import { Eyebrow, Note, Page, TopBar } from '../../kit/Page';
import { plural } from '../../copy';
import { BoardPanel } from '../Board/BoardPanel';
import styles from './Rush.module.css';

interface Props {
  userId: string | null;
  best: RunSummary | null;
  onStart: () => void;
  onBack: () => void;
  onSignIn: () => void;
}

/* Before a Rush: the leaderboard, and a button that starts the clock (a run's clock starts when it mounts). */
export function RushLobby({ userId, best, onStart, onBack, onSignIn }: Props) {
  return (
    <Page tone="rush">
      <TopBar title="Meteor Rush" onBack={onBack} backLabel="Tonight" />
      <Eyebrow tone="mars">Leaderboard</Eyebrow>
      <Note>
        Chart as many skies as you can in {formatClock(SURVIVAL_LIMIT_MS)}.
        {best && best.sites > 0 ? ` Your best is ${plural(best.sites, 'sky', 'skies')}.` : ''}
      </Note>
      <BoardPanel kind="rush" userId={userId} onSignIn={onSignIn} />
      <div className={styles.actions}>
        <Button block onClick={onStart}>Start rush</Button>
      </div>
    </Page>
  );
}
