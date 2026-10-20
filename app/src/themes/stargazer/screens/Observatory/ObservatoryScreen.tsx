import { ADMIN_PAGES } from '../../../../domain/adminPages';
import { displayName, initial } from '../../../../domain/profile';
import type { Night } from '../../../../domain/types';
import { useHandleEditor } from '../../../../game/account/useHandleEditor';
import { useCrew } from '../../../../game/crew/useCrew';
import { usePlayerStats } from '../../../../game/hooks/usePlayerStats';
import { useResource } from '../../../../hooks/useResource';
import { useIsAdmin } from '../../../../services/auth/useIsAdmin';
import type { AuthState } from '../../../../services/auth/authContext';
import { signOut } from '../../../../services/repositories/auth';
import { getProfile } from '../../../../services/repositories/profiles';
import { Button } from '../../kit/Button';
import { Moon } from '../../kit/Moon';
import { Avatar, Eyebrow, Note, Page, TopBar } from '../../kit/Page';
import { useWide } from '../../kit/useWide';
import { TabBar, type Tab } from '../../kit/TabBar';
import { cx } from '../../kit/cx';
import { monthOf, plural } from '../../copy';
import { SignIn } from './SignIn';
import { Stargazers } from './Stargazers';
import styles from './Observatory.module.css';

interface Props {
  auth: AuthState;
  today: number;
  /** every night of this month, as far as they are known */
  month: Night[];
  streak: number;
  named: number;
  onTab: (tab: Tab) => void;
  onDuel: (friendId: string) => void;
  onHowTo: () => void;
}

function Profile({ auth, userId, streak, named, month, today, onDuel }: Omit<Props, 'onTab' | 'onHowTo'> & { userId: string }) {
  const handle = useHandleEditor(userId, auth.username, auth.setHandle);
  const stats = usePlayerStats(userId);
  const crew = useCrew(userId, 'week');
  const me = useResource('me:' + userId, () => getProfile(userId));
  const { admin } = useIsAdmin(userId);
  const m = monthOf(today);
  const duels = stats.duels;
  return (
    <>
      <div className={styles.who}>
        <Avatar letter={initial({ username: auth.username })} size={64} />
        <div className={styles.whoText}>
          {handle.editing ? (
            <div className={styles.edit}>
              <input className={styles.input} aria-label="Your handle" value={handle.draft} maxLength={16} autoFocus onChange={e => handle.setDraft(e.target.value)} />
              <Button size="sm" disabled={handle.saving} onClick={handle.save}>{handle.saving ? '…' : 'Save'}</Button>
              <Button size="sm" kind="ghost" onClick={handle.cancel}>Cancel</Button>
            </div>
          ) : (
            <button className={styles.name} onClick={handle.start} aria-label="Edit your handle">{displayName({ username: auth.username }) || 'Stargazer'}</button>
          )}
          <span className={styles.rank}>Night watch · {plural(streak, 'night')} in a row{stats.rank ? ` · #${stats.rank} this week` : ''}</span>
          {handle.error && <span className={styles.error}>{handle.error}</span>}
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}><b>{named}</b><span>named</span></div>
        <div className={styles.stat}><b>{stats.atPar}</b><span>skies at par</span></div>
        <div className={styles.stat}><b>{duels ? `${duels.won}–${duels.lost}` : '0–0'}</b><span>duels</span></div>
      </div>

      <section className={styles.moons}>
        <div className={styles.moonsHead}><b>{m.name} moons</b><span>Full moon = perfect night</span></div>
        <div className={styles.moonGrid}>
          {m.days.map(d => <Moon key={d} night={month.find(n => n.day === d)} size={30} today={d === today} future={d > today} />)}
        </div>
      </section>

      <Stargazers userId={userId} crew={crew} code={me.data?.invite_code ?? '—'} onDuel={onDuel} />

      {stats.board.length > 0 && (
        <section className={styles.block}>
          <Eyebrow tone="soft">This week’s night watch</Eyebrow>
          <ol className={styles.board}>
            {stats.board.slice(0, 10).map((r, i) => (
              <li key={r.user_id} className={cx(styles.boardRow, r.user_id === userId && styles.mine)}>
                <span className={styles.place}>{i + 1}</span><span className={styles.boardName}>{displayName(r)}{r.user_id === userId ? ' (you)' : ''}</span><span>{r.score}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {admin && (
        <section className={styles.block}>
          <Eyebrow tone="soft">Admin</Eyebrow>
          <div className={styles.adminList}>
            {ADMIN_PAGES.map(p => <Button key={p.id} kind="soft" size="sm" title={p.hint} onClick={() => window.location.assign(p.href)}>{p.label}</Button>)}
          </div>
        </section>
      )}
      <Button block kind="outline" size="md" onClick={signOut}>Sign out</Button>
    </>
  );
}

/* Observatory (1j): the player's own page. Signed out, the way to sign in; signed in, who they are, their numbers,
   this month's moons, fellow stargazers and the week's board. Replaces the staff office. */
export function ObservatoryScreen(props: Props) {
  const { auth, onTab, onHowTo } = props;
  const wide = useWide();
  return (
    <Page tone="night" className={wide ? styles.pageWide : styles.page}>
      <TopBar title={wide ? 'Observatory' : undefined} onBack={wide ? () => onTab('tonight') : undefined} backLabel="Tonight" />
      {!auth.ready && <Note>Checking who you are…</Note>}
      {auth.ready && !auth.userId && <SignIn />}
      {auth.userId && <Profile {...props} userId={auth.userId} />}
      <Button block kind="ghost" size="md" onClick={onHowTo}>How stargazing works</Button>
      {!wide && <TabBar active="me" onOpen={onTab} />}
    </Page>
  );
}
