import { useState } from 'react';
import { ADMIN_PAGES } from '../../../../domain/adminPages';
import { displayName, initial } from '../../../../domain/profile';
import type { Night } from '../../../../domain/types';
import { useHandleEditor } from '../../../../game/account/useHandleEditor';
import { useCrew, type Crew } from '../../../../game/crew/useCrew';
import { usePlayerStats } from '../../../../game/hooks/usePlayerStats';
import { useResource } from '../../../../hooks/useResource';
import { useIsAdmin } from '../../../../services/auth/useIsAdmin';
import type { AuthState } from '../../../../services/auth/authContext';
import { signOut } from '../../../../services/repositories/auth';
import { getProfile } from '../../../../services/repositories/profiles';
import { Button } from '../../kit/Button';
import { Scroll } from '../../kit/Layout';
import { Moon } from '../../kit/Moon';
import { Avatar, Note, Page, TopBar } from '../../kit/Page';
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

/** The Observatory's own pages: the overview, and the two lists too long to share a phone screen with it. */
type View = 'overview' | 'stargazers' | 'board';
type Stats = ReturnType<typeof usePlayerStats>;

function Overview({ auth, userId, streak, named, month, today, stats, crew, onOpen }: Pick<Props, 'auth' | 'streak' | 'named' | 'month' | 'today'> & { userId: string; stats: Stats; crew: Crew; onOpen: (v: View) => void }) {
  const handle = useHandleEditor(userId, auth.username, auth.setHandle);
  const { admin } = useIsAdmin(userId);
  const m = monthOf(today);
  const duels = stats.duels;
  const f = crew.friendships;
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

      <div className={styles.links}>
        <button className={styles.link} onClick={() => onOpen('stargazers')}>
          <b>Fellow stargazers</b>
          <span>{f ? plural(f.friends.length, 'friend') : '…'}{f && f.incoming.length > 0 ? ` · ${f.incoming.length} asking` : ''}</span>
          {f && f.incoming.length > 0 && <i className={styles.ping} aria-label="requests waiting" />}
        </button>
        <button className={styles.link} onClick={() => onOpen('board')}>
          <b>This week’s night watch</b><span>{stats.rank ? `You’re #${stats.rank}` : 'The leaderboard'}</span>
        </button>
      </div>
      {admin && (
        <div className={styles.adminList}>
          {ADMIN_PAGES.map(p => <Button key={p.id} kind="soft" size="sm" title={p.hint} onClick={() => window.location.assign(p.href)}>{p.label}</Button>)}
        </div>
      )}
    </>
  );
}

function WeekBoard({ userId, stats }: { userId: string; stats: Stats }) {
  if (stats.boardError) return <Note tone="error">Couldn’t load the board: {stats.boardError}</Note>;
  if (stats.board.length === 0) return <Note>Nobody has charted a sky this week yet. Be the first.</Note>;
  return (
    <Scroll label="This week’s night watch">
      <ol className={styles.board}>
        {stats.board.map((r, i) => (
          <li key={r.user_id} className={cx(styles.boardRow, r.user_id === userId && styles.mine)}>
            <span className={styles.place}>{i + 1}</span><span className={styles.boardName}>{displayName(r)}{r.user_id === userId ? ' (you)' : ''}</span><span>{r.score}</span>
          </li>
        ))}
      </ol>
    </Scroll>
  );
}

function SignedIn(props: Props & { userId: string; view: View; setView: (v: View) => void }) {
  const { userId, view, setView, onDuel } = props;
  const stats = usePlayerStats(userId);
  const crew = useCrew(userId, 'week');
  const me = useResource('me:' + userId, () => getProfile(userId));
  if (view === 'stargazers') return <Stargazers userId={userId} crew={crew} code={me.data?.invite_code ?? '—'} onDuel={onDuel} />;
  if (view === 'board') return <WeekBoard userId={userId} stats={stats} />;
  return <Overview {...props} stats={stats} crew={crew} onOpen={setView} />;
}

const TITLES: Record<View, string> = { overview: 'Observatory', stargazers: 'Fellow stargazers', board: 'This week’s night watch' };

/* Observatory (1j): the player's own page. Signed out, the way to sign in; signed in, who they are, their numbers and
   this month's moons, with fellow stargazers and the week's board one tap away. Replaces the staff office. */
export function ObservatoryScreen(props: Props) {
  const { auth, onTab, onHowTo } = props;
  const wide = useWide();
  const [view, setView] = useState<View>('overview');
  const sub = view !== 'overview';
  return (
    <Page tone="night" className={wide ? styles.pageWide : styles.page}>
      <TopBar title={sub || wide ? TITLES[view] : undefined} small={sub && !wide}
        onBack={sub ? () => setView('overview') : wide ? () => onTab('tonight') : undefined} backLabel={sub ? 'Observatory' : 'Tonight'} />
      {!auth.ready && <Note>Checking who you are…</Note>}
      {auth.ready && !auth.userId && <SignIn />}
      {auth.userId && <SignedIn {...props} userId={auth.userId} view={view} setView={setView} />}
      {!sub && (
        <div className={styles.footer}>
          <Button kind="ghost" size="sm" onClick={onHowTo}>How stargazing works</Button>
          {auth.userId && <Button kind="ghost" size="sm" onClick={signOut}>Sign out</Button>}
        </div>
      )}
      {!wide && <TabBar active="me" onOpen={onTab} />}
    </Page>
  );
}
