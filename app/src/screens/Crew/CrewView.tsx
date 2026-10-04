import { useState } from 'react';
import { displayName, initial } from '../../domain/profile';
import type { BoardScope, Profile } from '../../domain/types';
import { searchPlayers } from '../../services/repositories/profiles';
import { Avatar, Button, Field, ListRow, Panel, RankRow, ScopeTabs, TabHeader } from '../../ui';
import { boardRows } from './boardRows';
import type { Crew } from './useCrew';
import { relationTo, SEARCH_LABEL } from './relation';
import styles from './Crew.module.css';

interface Props {
  userId: string;
  me: Profile | null | undefined;
  crew: Crew;
  scope: BoardScope;
  onScope: (s: BoardScope) => void;
  onOpenProfile: (p: Profile) => void;
}

/** Find a workmate, answer requests, and see how the crew ranks. */
export function CrewView({ userId, me, crew, scope, onScope, onOpenProfile }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[] | null>(null);
  const [searching, setSearching] = useState(false);
  const f = crew.friendships;
  const code = (me && me.invite_code) || '—';

  const runSearch = async () => {
    setSearching(true);
    const r = await searchPlayers(query, userId);
    setResults(r.ok ? r.data : []);
    setSearching(false);
  };

  return (
    <div className={styles.stack}>
      <Panel tab="FIND A WORKMATE" className={styles.pad16}>
        <div className={styles.searchRow}>
          <Field type="text" className={styles.grow} value={query} onChange={e => setQuery(e.target.value)} placeholder="handle or code, e.g. CAT-7K2P" />
          <Button onClick={runSearch} style={{ padding: '0 20px' }}>{searching ? '…' : 'SEARCH'}</Button>
        </div>
        <div className={styles.fine}>SEARCH BY HANDLE OR PERSONAL CODE ONLY &mdash; NEVER BY EMAIL. YOUR OWN CODE: <span className={styles.code}>{code}</span></div>
        {!!(results && results.length) && (
          <div className={styles.results}>
            {results.map(p => {
              const rel = relationTo(f, p.id);
              return (
                <ListRow key={p.id}>
                  <Avatar size="sm" letter={initial(p)} />
                  <button type="button" className={styles.person} onClick={() => onOpenProfile(p)}>{displayName(p)}</button>
                  <Button size="chip" variant={rel === 'none' ? 'primary' : 'secondary'} disabled={rel !== 'none'}
                    style={{ opacity: rel === 'none' ? 1 : 0.6 }} onClick={() => crew.add(p.id)}>{SEARCH_LABEL[rel]}</Button>
                </ListRow>
              );
            })}
          </div>
        )}
        {!!(results && !results.length) && <div className={styles.none}>NOBODY ON FILE UNDER THAT NAME.</div>}
      </Panel>

      {f && f.incoming.length > 0 && (
        <Panel tab="TRANSFER REQUESTS" tone="orchid" tight flush className={styles.pad10}>
          {f.incoming.map(r => (
            <div key={r.row.id} className={styles.request}>
              <span className={styles.requestName}>{displayName(r.person)}</span>
              <Button size="chip" onClick={() => crew.respond(r.row.id, true)}>ACCEPT</Button>
              <Button size="chip" variant="paper" style={{ color: 'var(--text-4)' }} onClick={() => crew.respond(r.row.id, false)}>DECLINE</Button>
            </div>
          ))}
        </Panel>
      )}

      <div>
        <div className={styles.boardHead}>
          <TabHeader>WORKMATE BOARD</TabHeader>
          <ScopeTabs scope={scope} onChange={onScope} />
        </div>
        <Panel tight flush className={styles.boardCard}>
          {f && f.friends.length === 0 && (
            <div className={styles.empty}>NO WORKMATES YET. SEARCH A HANDLE ABOVE, OR PASS YOUR CODE <span className={styles.code}>{code}</span> TO A FRIEND.</div>
          )}
          {boardRows(crew.board.data ?? [], f ? f.friends : [], userId).map(r => (
            <RankRow key={r.rank} rank={r.rank} name={r.name} score={r.score} isSelf={r.isSelf} onOpen={() => onOpenProfile(r.person)} />
          ))}
        </Panel>
      </div>

      {f && f.outgoing.length > 0 && (
        <div className={styles.pending}>AWAITING SIGN-OFF: {f.outgoing.map(r => displayName(r.person)).join(', ')}</div>
      )}
    </div>
  );
}
