import { useState } from 'react';
import type { BoardKind } from '../../../../domain/ranking';
import { Pills } from '../../kit/Pills';
import { BOARD_TAB } from '../../copy';
import { BoardPanel } from './BoardPanel';

interface Props {
  /** the boards this page can show; with more than one, a switch between them */
  kinds: BoardKind[];
  userId: string | null;
  day: number;
  onSignIn: () => void;
  onChallenge?: (friendId: string) => void;
  challengeBusy?: boolean;
}

/* The inside of a board page: a switch between its boards, if it has several, and the open one. It leaves the page
   (title, back button, tab bar) to whoever holds it, so the Observatory and the board page share it. */
export function BoardView({ kinds, userId, day, onSignIn, onChallenge, challengeBusy }: Props) {
  const [kind, setKind] = useState<BoardKind>(kinds[0]);
  return (
    <>
      {kinds.length > 1 && <Pills label="Board" value={kind} onChange={setKind} items={kinds.map(k => ({ id: k, label: BOARD_TAB[k] }))} />}
      <BoardPanel key={kind} kind={kind} userId={userId} day={day} onSignIn={onSignIn} onChallenge={onChallenge} challengeBusy={challengeBusy} />
    </>
  );
}
