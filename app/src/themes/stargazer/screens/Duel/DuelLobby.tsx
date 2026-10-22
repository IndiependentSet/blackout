import { useEffect, useState } from 'react';
import { matchOutcome, otherPlayer } from '../../../../domain/match';
import { displayName, initial } from '../../../../domain/profile';
import { RATING_START } from '../../../../domain/rating';
import type { MatchView } from '../../../../domain/types';
import { useLadder } from '../../../../game/match/useLadder';
import { useLobby } from '../../../../game/match/useLobby';
import { useMatchmaking } from '../../../../game/match/useMatchmaking';
import { UNPUBLISHED_COPY } from '../../../../services/repositories/levelPools';
import { Button } from '../../kit/Button';
import { Scroll } from '../../kit/Layout';
import { Avatar, Eyebrow, Note, Page, TopBar } from '../../kit/Page';
import { NO_SKIES } from '../../copy';
import styles from './Duel.module.css';

interface Props {
  userId: string;
  /** a fellow stargazer picked elsewhere, listed first */
  preselect?: string | null;
  onOpenMatch: (matchId: string) => void;
  onBack: () => void;
}

const OUTCOME = { won: 'You won', lost: 'They won', drawn: 'A tie', void: 'Called off', open: '' } as const;
const say = (msg: string) => (msg === UNPUBLISHED_COPY ? NO_SKIES : msg);

function useSeconds(since: number | null): number {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (since === null) return;
    const tick = () => setS(Math.max(0, Math.floor((Date.now() - since) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [since]);
  return since === null ? 0 : s;
}

/* Star Duel lobby (1h): challenges waiting for you, duels on the clock, your fellow stargazers to challenge, and a
   ranked duel against whoever else is looking. The server holds every match; this screen only reads and asks. */
export function DuelLobby({ userId, preselect, onOpenMatch, onBack }: Props) {
  const lobby = useLobby(userId);
  const ladder = useLadder(userId);
  const { search, start, cancel } = useMatchmaking(onOpenMatch);
  const seconds = useSeconds(search.status === 'searching' ? search.startedAt : null);
  const { groups, friends, record } = lobby;
  const sorted = [...friends].sort((a, b) => Number(b.person.id === preselect) - Number(a.person.id === preselect));
  const nameOf = (v: MatchView) => lobby.names[otherPlayer(v.match, userId)] || 'A stargazer';
  const challenge = (id: string) => { lobby.challenge(id).then(m => { if (m) onOpenMatch(m); }); };
  const accept = (id: string) => { lobby.accept(id).then(ok => { if (ok) onOpenMatch(id); }); };
  const rating = ladder.mine ? ladder.mine.rating : RATING_START;

  return (
    <Page tone="duel">
      <TopBar title="Star Duel" onBack={onBack} backLabel="Tonight" />
      <p className={styles.lead}>You both get the same sky. Fewer stars wins. If you tie, the faster one wins.</p>
      <div className={styles.record}>
        <span>Rating <b>{rating}</b></span>
        <span><b>{record ? record.won : 0}</b> won · <b>{record ? record.lost : 0}</b> lost · <b>{record ? record.drawn : 0}</b> tied</span>
      </div>
      {lobby.error && <Note tone="error">{say(lobby.error)}</Note>}

      {groups.incoming.map(v => (
        <section key={v.match.id} className={styles.invite}>
          <div className={styles.who}>
            <Avatar letter={nameOf(v).replace('@', '').slice(0, 1).toUpperCase() || '?'} size={46} tone="mint" />
            <div className={styles.whoText}><b>{nameOf(v)} challenged you</b><span>Same sky, five minutes on the clock.</span></div>
          </div>
          <div className={styles.inviteActions}>
            <Button kind="mint" size="md" className={styles.grow} disabled={lobby.busy} onClick={() => accept(v.match.id)}>Accept</Button>
            <Button kind="ghost" size="md" tone="soft" disabled={lobby.busy} onClick={() => lobby.decline(v.match.id)}>Decline</Button>
          </div>
        </section>
      ))}

      {groups.playing.map(v => (
        <div key={v.match.id} className={styles.row}>
          <div className={styles.rowText}><b>Duel with {nameOf(v)}</b><span>On the clock</span></div>
          <Button kind="mint" size="sm" onClick={() => onOpenMatch(v.match.id)}>Back to the sky</Button>
        </div>
      ))}
      {groups.sent.map(v => (
        <div key={v.match.id} className={styles.row}>
          <div className={styles.rowText}><b>Waiting for {nameOf(v)}</b><span>They have an hour to answer</span></div>
          <Button kind="soft" size="sm" onClick={() => onOpenMatch(v.match.id)}>Open</Button>
        </div>
      ))}

      <Scroll label="Fellow stargazers">
      <Eyebrow>Fellow stargazers</Eyebrow>
      <div className={styles.list}>
        {sorted.map(link => {
          const busy = lobby.engaged.has(link.person.id);
          return (
            <div key={link.person.id} className={styles.row}>
              <Avatar letter={initial(link.person)} size={40} tone="soft" />
              <div className={styles.rowText}><b>{displayName(link.person)}</b><span>{busy ? 'Already in a duel with you' : 'Ready for a duel'}</span></div>
              <Button kind="soft" size="sm" disabled={lobby.busy || busy} onClick={() => challenge(link.person.id)}>Challenge</Button>
            </div>
          );
        })}
        {!lobby.loading && sorted.length === 0 && <Note>No fellow stargazers yet. Add some from your page (Me), then come back.</Note>}
      </div>

      {groups.recent.length > 0 && (
        <>
          <Eyebrow tone="soft">Recent duels</Eyebrow>
          <div className={styles.list}>
            {groups.recent.map(v => (
              <div key={v.match.id} className={styles.recent}><span>{nameOf(v)}</span><span>{OUTCOME[matchOutcome(v.match, userId)]}</span></div>
            ))}
          </div>
        </>
      )}
      </Scroll>

      <div className={styles.random}>
        {search.status === 'error' && <Note tone="error">{say(search.message)}</Note>}
        {search.status === 'timeout' && <Note>Nobody else is looking right now. Try again in a minute, or challenge a fellow stargazer.</Note>}
        {search.status === 'searching'
          ? <Button block kind="outline" size="md" tone="mint" onClick={cancel}>Looking for a stargazer… {seconds}s · cancel</Button>
          : <Button block kind="outline" size="md" tone="mint" disabled={lobby.busy} onClick={() => start(0)}>Duel a random stargazer</Button>}
        <span className={styles.hint}>A random duel is ranked and moves your rating.</span>
      </div>
    </Page>
  );
}
