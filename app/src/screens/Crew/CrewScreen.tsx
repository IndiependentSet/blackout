import { useState } from 'react';
import type { BoardScope, MySquad, Profile, Squad } from '../../domain/types';
import { useResource } from '../../hooks/useResource';
import { getPlayerScore } from '../../services/repositories/leaderboards';
import { getProfile } from '../../services/repositories/profiles';
import { Button, Screen, ScreenHeader, cx } from '../../ui';
import { CrewView } from './CrewView';
import { HeadToHead } from './HeadToHead';
import { ProfileView } from './ProfileView';
import { relationTo } from './relation';
import { SquadsView } from './SquadsView';
import { SquadView } from './SquadView';
import { useCrew } from './useCrew';
import { useSquads } from './useSquads';
import styles from './Crew.module.css';

type View = 'crew' | 'squads' | 'squad' | 'profile' | 'h2h';
type OpenSquad = Squad & Partial<MySquad>;

/* Crew Roster & Squads — the social layer opened from the STAFF ID CARD. A
   small view stack: crew / squads at the top level; profile, head-to-head and
   a squad as drill-downs. The data each view needs comes from hooks keyed on
   what is open, so a slow reply for a view you've left is ignored. */
export function CrewScreen({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [view, setView] = useState<View>('crew');
  const [scope, setScope] = useState<BoardScope>('week');
  const [squad, setSquad] = useState<OpenSquad | null>(null);
  const [viewing, setViewing] = useState<Profile | null>(null);

  const me = useResource('me:' + userId, () => getProfile(userId));
  const myScore = useResource('score:' + userId, () => getPlayerScore(userId));
  const theirScore = useResource(viewing ? 'score:' + viewing.id : null, () => getPlayerScore((viewing as Profile).id));
  const crew = useCrew(userId, scope);
  const squads = useSquads(userId, scope, squad);

  const friends = crew.friendships ? crew.friendships.friends : [];
  const drill = view === 'profile' || view === 'h2h' || view === 'squad';
  const rel = viewing ? relationTo(crew.friendships, viewing.id) : 'none';
  const incoming = crew.friendships ? crew.friendships.incoming.length : 0;

  const back = () => {
    if (view === 'h2h') setView('profile');
    else if (view === 'profile') { setView('crew'); setViewing(null); }
    else if (view === 'squad') { setView('squads'); setSquad(null); }
    else onClose();
  };
  const openProfile = (p: Profile) => { setViewing(p); setView('profile'); };
  const openSquad = (s: OpenSquad) => { setSquad(s); setView('squad'); };
  const rowOf = (list: { row: { id: string }; person: Profile }[]) => list.find(x => x.person.id === viewing?.id);

  return (
    <Screen maxWidth={760}>
      <ScreenHeader title="CREW ROSTER" backLabel={drill ? 'BACK' : 'BACK TO SITE'} onBack={back} />

      {!drill && (
        <div className={styles.switch}>
          <Button size="md" variant={view === 'crew' ? 'primary' : 'muted'} className={cx(styles.switchBtn)} onClick={() => setView('crew')}>
            <span>WORKMATES</span>
            {incoming > 0 && <span className={styles.badge}>{incoming}</span>}
          </Button>
          <Button size="md" variant={view === 'squads' ? 'primary' : 'muted'} className={styles.switchBtn} onClick={() => setView('squads')}>SQUADS</Button>
        </div>
      )}

      {view === 'crew' && <CrewView userId={userId} me={me.data} crew={crew} scope={scope} onScope={setScope} onOpenProfile={openProfile} />}

      {view === 'profile' && viewing && (
        <ProfileView person={viewing} relation={rel} score={theirScore.data}
          onAdd={() => crew.add(viewing.id)}
          onRemove={() => { const f = crew.friendships && rowOf(crew.friendships.friends); if (f) crew.remove(f.row.id).then(() => setView('crew')); }}
          onAccept={() => { const f = crew.friendships && rowOf(crew.friendships.incoming); if (f) crew.respond(f.row.id, true); }}
          onHeadToHead={() => setView('h2h')} />
      )}

      {view === 'h2h' && viewing && <HeadToHead me={me.data} person={viewing} mine={myScore.data} theirs={theirScore.data} />}

      {view === 'squads' && <SquadsView squads={squads} onOpen={openSquad} />}

      {view === 'squad' && squad && (
        <SquadView squad={squad} userId={userId} scope={scope} onScope={setScope}
          board={squads.board.data ?? []} memberCount={(squads.members.data ?? []).length} friends={friends}
          onOpenProfile={openProfile}
          onLeave={() => squads.leave(squad.id).then(() => { setView('squads'); setSquad(null); })} />
      )}
    </Screen>
  );
}
