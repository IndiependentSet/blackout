import type { BoardKind } from '../../../../domain/ranking';
import { Button } from '../../kit/Button';
import { DeskPage } from '../../kit/DeskPage';
import { TopBar, Note } from '../../kit/Page';
import { BOARDS } from '../../copy';
import { BoardView } from './BoardView';
import styles from './BoardScreen.module.css';

interface Props {
  kinds: BoardKind[];
  userId: string | null;
  day: number;
  /** where Back goes, named: "Tonight", "Voyage", "Lobby" */
  backLabel: string;
  onBack: () => void;
  onSignIn: () => void;
  /** the ladder's: challenge a fellow stargazer from their row (a failed try is `challengeError`) */
  onChallenge?: (friendId: string) => void;
  challengeBusy?: boolean;
  challengeError?: string | null;
  /** the ladder's: the way to a ranked opponent, which the duel lobby holds */
  onFindRanked?: () => void;
}

/* A leaderboard's own page, reached from a mode's hub, lobby or result by one small link. It is never part of a board
   in play: the player opens it, reads it and goes back to where they were. */
export function BoardScreen({ kinds, userId, day, backLabel, onBack, onSignIn, onChallenge, challengeBusy, challengeError, onFindRanked }: Props) {
  return (
    <DeskPage active={kinds[0] === 'duel' || kinds[0] === 'season' ? 'duel' : kinds[0] === 'rush' ? 'rush' : kinds[0] === 'voyage' ? 'voyage' : 'tonight'} tone={kinds[0] === 'duel' ? 'duel' : kinds[0] === 'rush' ? 'rush' : 'night'}>
      <TopBar title={kinds.length > 1 ? 'Leaderboard' : BOARDS[kinds[0]].title} onBack={onBack} backLabel={backLabel} />
      {challengeError && <Note tone="error">{challengeError}</Note>}
      <BoardView kinds={kinds} userId={userId} day={day} onSignIn={onSignIn} onChallenge={onChallenge} challengeBusy={challengeBusy} />
      {onFindRanked && userId && <Button kind="mint" size="md" block className={styles.find} onClick={onFindRanked}>Find a ranked duel</Button>}
    </DeskPage>
  );
}
