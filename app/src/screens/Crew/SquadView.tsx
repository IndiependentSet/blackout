import type { BoardScope, MySquad, Profile, Squad } from '../../domain/types';
import { useClipboard } from '../../hooks/useClipboard';
import { Button, Panel, RankRow, ScopeTabs, TabHeader } from '../../ui';
import { boardRows } from './boardRows';
import type { FriendLink, BoardRow } from '../../domain/types';
import styles from './Crew.module.css';

interface Props {
  squad: Squad & Partial<MySquad>;
  userId: string;
  scope: BoardScope;
  onScope: (s: BoardScope) => void;
  board: BoardRow[];
  memberCount: number;
  friends: FriendLink[];
  onOpenProfile: (p: Profile) => void;
  onLeave: () => void;
}

/** One squad: how its members rank, and the invite code to bring more on. */
export function SquadView({ squad, userId, scope, onScope, board, memberCount, friends, onOpenProfile, onLeave }: Props) {
  const { copied, copy } = useClipboard(1600);
  return (
    <div className={styles.stack}>
      <div>
        <div className={styles.boardHead}>
          <TabHeader>{squad.name || 'SQUAD'}</TabHeader>
          <ScopeTabs scope={scope} onChange={onScope} />
        </div>
        <Panel tight flush className={styles.boardCard}>
          {boardRows(board, friends, userId).map(r => (
            <RankRow key={r.rank} rank={r.rank} name={r.name} score={r.score} isSelf={r.isSelf} onOpen={() => onOpenProfile(r.person)} />
          ))}
        </Panel>
      </div>

      <Panel tab="SITE PASS" tone="orchid" className={styles.pad16}>
        <div className={styles.invite}>
          <div className={styles.inviteBox}>
            <div className={styles.inviteLabel}>INVITE CODE</div>
            <div className={styles.inviteCode}>{squad.invite_code || '—'}</div>
          </div>
          <Button onClick={() => copy(squad.invite_code)} style={{ minHeight: 46, padding: '0 18px', fontSize: 13 }}>{copied ? 'COPIED!' : 'COPY CODE'}</Button>
        </div>
        <div className={styles.fine}>{memberCount + (memberCount === 1 ? ' member on site' : ' members on site') + '. Anyone with the code can clock on.'}</div>
        <Button variant="paper" size="chip" className={styles.leave} onClick={onLeave} style={{ minHeight: 42, padding: '0 16px', letterSpacing: '.06em' }}>
          {squad.role === 'foreman' ? 'LEAVE SQUAD (YOU’RE FOREMAN)' : 'LEAVE SQUAD'}
        </Button>
      </Panel>
    </div>
  );
}
