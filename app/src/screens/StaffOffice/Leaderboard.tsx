import { useState } from 'react';
import { displayName } from '../../domain/profile';
import type { BoardScope } from '../../domain/types';
import { useResource } from '../../hooks/useResource';
import { getLeaderboard } from '../../services/repositories/leaderboards';
import { Message, Panel, RankRow, ScopeTabs, TabHeader } from '../../ui';
import styles from './StaffOffice.module.css';

/** The crew-wide board, by week or all-time. */
export function Leaderboard({ userId }: { userId: string }) {
  const [scope, setScope] = useState<BoardScope>('week');
  const board = useResource('board:' + scope, () => getLeaderboard(scope));
  const rows = board.data ?? [];

  return (
    <div>
      <div className={styles.boardHead}>
        <TabHeader>CREW LEADERBOARD</TabHeader>
        <ScopeTabs scope={scope} onChange={setScope} />
      </div>
      <Panel tight flush style={{ borderRadius: '4px 16px 16px 16px' }}>
        {board.error && <Message tone="error">COULDN&apos;T LOAD THE BOARD &mdash; {board.error}</Message>}
        {!board.error && !board.loading && rows.length === 0 && <Message tone="muted">NO CLEARS ON THE BOARD YET &mdash; BE THE FIRST.</Message>}
        {rows.map((row, i) => (
          <RankRow key={row.user_id} rank={i + 1} score={row.score} isSelf={row.user_id === userId}
            name={displayName(row) + (row.user_id === userId ? ' (YOU)' : '')} />
        ))}
      </Panel>
    </div>
  );
}
