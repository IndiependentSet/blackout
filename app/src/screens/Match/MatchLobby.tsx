import type { ReactNode } from 'react';
import { matchOutcome, otherPlayer } from '../../domain/match';
import { displayName } from '../../domain/profile';
import type { FriendLink, MatchView } from '../../domain/types';
import { IS_MOCK_SOURCE } from '../../services/levels';
import { Button, ListRow, Message, Panel, Screen, ScreenHeader, Stat, Tag, cx } from '../../ui';
import { useLobby, type Lobby, type LobbyDeps } from './useLobby';
import styles from './Match.module.css';

interface Props {
  userId: string;
  /** a workmate picked from the crew roster: shown highlighted, ready to challenge */
  preselect?: string | null;
  onOpenMatch: (matchId: string) => void;
  onBack: () => void;
  /** only a test hands these in */
  deps?: LobbyDeps;
}

const OUTCOME = { won: 'WON', lost: 'LOST', drawn: 'DEAD HEAT', void: 'NO CONTEST', open: '' } as const;

function Empty({ children }: { children: string }) {
  return <div className={styles.empty}>{children}</div>;
}

function MatchRow({ view, userId, lobby, children }: { view: MatchView; userId: string; lobby: Lobby; children?: ReactNode }) {
  const other = otherPlayer(view.match, userId);
  return (
    <div className={styles.item}>
      <span className={styles.itemName}>{lobby.names[other] || 'WORKMATE'}</span>
      {children}
    </div>
  );
}

function FriendRow({ link, picked, taken, busy, onChallenge }: { link: FriendLink; picked: boolean; taken: boolean; busy: boolean; onChallenge: () => void }) {
  return (
    <div className={cx(styles.item, picked && styles.picked)}>
      <span className={styles.itemName}>{displayName(link.person)}</span>
      {taken && <span className={styles.itemNote}>ALREADY PLAYING</span>}
      <Button size="chip" disabled={busy || taken} onClick={onChallenge}>CHALLENGE</Button>
    </div>
  );
}

/* The 1vs1 front desk: answer or open the challenges you have, challenge a workmate, see your record. Everything
   here is read through the server; a failed read is a message, and the rest of the game never depends on it. */
export function MatchLobby({ userId, preselect, onOpenMatch, onBack, deps }: Props) {
  const lobby = useLobby(userId, deps);
  const { groups, friends, record } = lobby;
  const sorted = [...friends].sort((a, b) => Number(b.person.id === preselect) - Number(a.person.id === preselect));

  const challenge = (id: string) => { lobby.challenge(id).then(matchId => { if (matchId) onOpenMatch(matchId); }); };
  const accept = (id: string) => { lobby.accept(id).then(ok => { if (ok) onOpenMatch(id); }); };

  return (
    <Screen maxWidth={760}>
      <ScreenHeader title="1VS1 LOBBY" backLabel="DASHBOARD" onBack={onBack} />
      <div className={styles.stack}>
        {lobby.error && <Message tone="error">{lobby.error.toUpperCase()}</Message>}

        <Panel tab="YOUR RECORD" tone="orchid">
          <div className={styles.record}>
            <Stat basis={110} value={record ? record.won : 0} label="WON" />
            <Stat basis={110} tone="lilac" value={record ? record.lost : 0} label="LOST" />
            <Stat basis={110} value={record ? record.drawn : 0} label="DEAD HEAT" />
          </div>
        </Panel>

        {groups.incoming.length > 0 && (
          <Panel tab="CHALLENGES FOR YOU">
            <div className={styles.list}>
              {groups.incoming.map(v => (
                <MatchRow key={v.match.id} view={v} userId={userId} lobby={lobby}>
                  <Button size="chip" variant="muted" disabled={lobby.busy} onClick={() => lobby.decline(v.match.id)}>DECLINE</Button>
                  <Button size="chip" disabled={lobby.busy} onClick={() => accept(v.match.id)}>ACCEPT</Button>
                </MatchRow>
              ))}
            </div>
          </Panel>
        )}

        {groups.playing.length > 0 && (
          <Panel tab="ON THE CLOCK">
            <div className={styles.list}>
              {groups.playing.map(v => (
                <MatchRow key={v.match.id} view={v} userId={userId} lobby={lobby}>
                  <Button size="chip" onClick={() => onOpenMatch(v.match.id)}>RETURN TO SITE</Button>
                </MatchRow>
              ))}
            </div>
          </Panel>
        )}

        {groups.sent.length > 0 && (
          <Panel tab="WAITING FOR AN ANSWER">
            <div className={styles.list}>
              {groups.sent.map(v => (
                <MatchRow key={v.match.id} view={v} userId={userId} lobby={lobby}>
                  <Button size="chip" variant="secondary" onClick={() => onOpenMatch(v.match.id)}>OPEN</Button>
                </MatchRow>
              ))}
            </div>
          </Panel>
        )}

        <Panel tab="CHALLENGE A WORKMATE">
          {IS_MOCK_SOURCE && <Tag tone="orchid" size="sm">DEV MOCK</Tag>}
          <div className={styles.list}>
            {sorted.map(link => (
              <FriendRow key={link.person.id} link={link} picked={link.person.id === preselect} taken={lobby.engaged.has(link.person.id)}
                busy={lobby.busy} onChallenge={() => challenge(link.person.id)} />
            ))}
            {!lobby.loading && sorted.length === 0 && <Empty>NO WORKMATES YET. ADD SOME IN THE CREW ROSTER, THEN COME BACK.</Empty>}
          </div>
        </Panel>

        {groups.recent.length > 0 && (
          <Panel tab="RECENT MATCHES" tight>
            <div className={styles.list}>
              {groups.recent.map(v => (
                <ListRow key={v.match.id}>
                  <span className={styles.itemName}>{lobby.names[otherPlayer(v.match, userId)] || 'WORKMATE'}</span>
                  <span className={styles.itemNote}>{OUTCOME[matchOutcome(v.match, userId)]}</span>
                </ListRow>
              ))}
            </div>
          </Panel>
        )}
      </div>
    </Screen>
  );
}
