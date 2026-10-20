import { displayName, initial } from '../../../../domain/profile';
import type { Friendships } from '../../../../domain/types';
import { relationTo } from '../../../../game/crew/relation';
import type { Crew } from '../../../../game/crew/useCrew';
import { usePlayerSearch } from '../../../../game/crew/usePlayerSearch';
import { Button } from '../../kit/Button';
import { Avatar, Eyebrow, Note } from '../../kit/Page';
import styles from './Observatory.module.css';

const SEARCH_ACTION = { friend: 'Stargazing with you', outgoing: 'Asked', incoming: 'Answer below', none: 'Add' } as const;

/* Fellow stargazers: requests to answer, the ones you watch the sky with (and can duel), and finding more by handle or code. */
export function Stargazers({ userId, crew, code, onDuel }: { userId: string; crew: Crew; code: string; onDuel: (id: string) => void }) {
  const find = usePlayerSearch(userId);
  const f: Friendships | undefined = crew.friendships;
  return (
    <section className={styles.block}>
      <Eyebrow>Fellow stargazers</Eyebrow>
      {f && f.incoming.map(link => (
        <div key={link.row.id} className={styles.person}>
          <Avatar letter={initial(link.person)} size={40} tone="mint" />
          <div className={styles.personText}><b>{displayName(link.person)}</b><span>wants to stargaze with you</span></div>
          <Button kind="mint" size="sm" onClick={() => crew.respond(link.row.id, true)}>Accept</Button>
          <Button kind="ghost" size="sm" onClick={() => crew.respond(link.row.id, false)}>No</Button>
        </div>
      ))}
      {f && f.friends.map(link => (
        <div key={link.row.id} className={styles.person}>
          <Avatar letter={initial(link.person)} size={40} tone="soft" />
          <div className={styles.personText}><b>{displayName(link.person)}</b><span>stargazing with you</span></div>
          <Button kind="soft" size="sm" onClick={() => onDuel(link.person.id)}>Duel</Button>
        </div>
      ))}
      {f && f.friends.length === 0 && f.incoming.length === 0 && <Note>Nobody yet. Find a friend by their handle, or share your code: <b>{code}</b>.</Note>}
      <div className={styles.searchRow}>
        <input className={styles.input} aria-label="Find a stargazer" value={find.query} placeholder="Handle or code"
          onChange={e => find.setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && find.query.trim()) find.search(); }} />
        <Button size="md" disabled={!find.query.trim() || find.searching} onClick={find.search}>{find.searching ? '…' : 'Find'}</Button>
      </div>
      {find.results && find.results.length === 0 && <Note>No stargazer by that name or code.</Note>}
      {find.results && find.results.map(p => {
        const rel = relationTo(f, p.id);
        return (
          <div key={p.id} className={styles.person}>
            <Avatar letter={initial(p)} size={40} tone="soft" />
            <div className={styles.personText}><b>{displayName(p)}</b><span>{p.invite_code ?? ''}</span></div>
            <Button kind="soft" size="sm" disabled={rel !== 'none'} onClick={() => crew.add(p.id)}>{SEARCH_ACTION[rel]}</Button>
          </div>
        );
      })}
    </section>
  );
}
