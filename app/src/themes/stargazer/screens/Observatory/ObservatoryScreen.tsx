import { useState, type ReactNode } from 'react';
import { ADMIN_PAGES } from '../../../../domain/adminPages';
import { displayName, initial } from '../../../../domain/profile';
import type { Night } from '../../../../domain/types';
import { useCrew, type Crew } from '../../../../game/crew/useCrew';
import { useMyPlace, type Place } from '../../../../game/hooks/useBoard';
import { usePlayerStats } from '../../../../game/hooks/usePlayerStats';
import { useResource } from '../../../../hooks/useResource';
import { useIsAdmin } from '../../../../services/auth/useIsAdmin';
import type { AuthState } from '../../../../services/auth/authContext';
import { signOut } from '../../../../services/repositories/auth';
import { getProfile } from '../../../../services/repositories/profiles';
import { Button } from '../../kit/Button';
import { DeskHeader, type DeskProps } from '../../kit/DeskHeader';
import { Split } from '../../kit/Layout';
import { ListCard, ListRow } from '../../kit/ListCard';
import { Avatar, Note, Page, TopBar } from '../../kit/Page';
import { useWide } from '../../kit/useWide';
import { TabBar, type Tab } from '../../kit/TabBar';
import { plural } from '../../copy';
import { BoardView } from '../Board/BoardView';
import { AdminLinks } from './AdminLinks';
import { MonthCard } from './MonthCard';
import { ProfileEditor } from './ProfileEditor';
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
  /** the desktop header */
  desk: DeskProps;
  onTab: (tab: Tab) => void;
  onDuel: (friendId: string) => void;
  onStats: () => void;
  onHowTo: () => void;
}

/** The page's own views: the overview, and the pages too long to share a phone screen with it. */
type View = 'overview' | 'stargazers' | 'board' | 'profile' | 'admin';
type Stats = ReturnType<typeof usePlayerStats>;

function Well({ label, value }: { label: string; value: string }) {
  return <div className={styles.well}><span>{label}</span><b>{value}</b></div>;
}

function Overview({ auth, userId, streak, named, month, today, stats, crew, week, code, wide, footer, onOpen, onStats }: Pick<Props, 'auth' | 'streak' | 'named' | 'month' | 'today' | 'onStats'> & { userId: string; stats: Stats; crew: Crew; week: Place | null; code: string; wide: boolean; footer: ReactNode; onOpen: (v: View) => void }) {
  const { admin } = useIsAdmin(userId);
  const f = crew.friendships;
  const requests = f?.incoming.length ?? 0;
  const profile = (
    <section className={styles.profile}>
      <div className={styles.who}>
        <Avatar letter={initial({ username: auth.username })} avatar={auth.avatar} size={wide ? 56 : 48} />
        <div className={styles.whoText}>
          <b className={styles.name}>{displayName({ username: auth.username }) || 'Stargazer'}</b>
          <span className={styles.code}>{!wide && `${streak}-night streak · `}Code {code}</span>
        </div>
        <Button kind="soft" size="sm" onClick={() => onOpen('profile')}>Edit</Button>
      </div>
      {wide && (
        <div className={styles.wells}>
          <Well label="Streak" value={`${plural(streak, 'night')} in a row`} />
          <Well label="This week" value={week ? `#${week.entry.place} of ${week.total}` : '—'} />
        </div>
      )}
    </section>
  );
  const links = (
    <ListCard>
      <ListRow title="Friends" badge={requests > 0 ? plural(requests, 'request') : undefined} detail={f ? f.friends.length : '…'} onClick={() => onOpen('stargazers')} />
      <ListRow title="Leaderboard" detail={week ? `#${week.entry.place} this week` : undefined} onClick={() => onOpen('board')} />
      <ListRow title="All my stats" detail={`${named} named · ${stats.atPar} at par`} onClick={onStats} />
      {admin && !wide && <ListRow title="Admin" detail={ADMIN_PAGES.length + ' pages'} onClick={() => onOpen('admin')} />}
    </ListCard>
  );
  const adminList = admin && wide && (
    <div className={styles.adminList}>
      {ADMIN_PAGES.map(p => <Button key={p.id} kind="soft" size="sm" title={p.hint} onClick={() => window.location.assign(p.href)}>{p.label}</Button>)}
    </div>
  );
  if (wide) {
    return (
      <div className={styles.deskGrid}>
        <div className={styles.deskLeft}>{profile}{links}{adminList}{footer}</div>
        <MonthCard today={today} month={month} wide />
      </div>
    );
  }
  /* a phone: the month takes whatever height is left, so the page never scrolls */
  return <Split before={profile} lead={<MonthCard today={today} month={month} fill />} after={links} />;
}

function SignedIn(props: Props & { userId: string; view: View; setView: (v: View) => void; wide: boolean; footer: ReactNode; signOut: ReactNode }) {
  const { userId, view, setView, onDuel, wide, footer } = props;
  const stats = usePlayerStats(userId, null);
  const week = useMyPlace('week', userId, { day: props.today });
  const crew = useCrew(userId, 'week');
  const me = useResource('me:' + userId, () => getProfile(userId));
  const back = () => setView('overview');
  if (view === 'stargazers') return <Stargazers userId={userId} crew={crew} code={me.data?.invite_code ?? '—'} onDuel={onDuel} />;
  if (view === 'profile') return <><ProfileEditor userId={userId} auth={props.auth} onDone={back} />{props.signOut}</>;
  if (view === 'admin') return <AdminLinks />;
  if (view === 'board') return <BoardView kinds={['week', 'night', 'alltime']} userId={userId} day={props.today} onSignIn={back} />;
  return <Overview {...props} stats={stats} crew={crew} week={week} code={me.data?.invite_code ?? '—'} wide={wide} footer={footer} onOpen={setView} />;
}

const TITLES: Record<View, string> = { overview: 'Me', stargazers: 'Friends', board: 'Leaderboard', profile: 'Edit profile', admin: 'Admin' };

/* Me: the player's own page. Signed out, the way to sign in; signed in, who they are, this month's moons, and the
   links to friends, the week's board and their stats. */
export function ObservatoryScreen(props: Props) {
  const { auth, onTab, onHowTo, desk } = props;
  const wide = useWide();
  const [view, setView] = useState<View>('overview');
  const sub = view !== 'overview';
  const signOutButton = <div className={styles.footer}><Button kind="ghost" size="sm" onClick={signOut}>Sign out</Button></div>;
  /* the desktop's footer; a phone has How to play in the title bar and Sign out under Edit profile */
  const footer = wide && (
    <div className={styles.footer}>
      <Button kind="ghost" size="sm" onClick={onHowTo}>How to play</Button>
      {auth.userId && <Button kind="ghost" size="sm" onClick={signOut}>Sign out</Button>}
    </div>
  );
  const body = (
    <>
      {!auth.ready && <Note>Checking who you are…</Note>}
      {auth.ready && !auth.userId && <SignIn />}
      {auth.userId && <SignedIn {...props} userId={auth.userId} view={view} setView={setView} wide={wide} footer={footer} signOut={signOutButton} />}
      {!auth.userId && footer}
    </>
  );
  const howTo = !sub && !wide && <Button kind="ghost" size="sm" onClick={onHowTo}>How to play</Button>;
  const bar = <TopBar title={TITLES[view]} small={sub && !wide} onBack={sub ? () => setView('overview') : undefined} backLabel="Me" right={howTo} />;

  if (wide) {
    const overview = !sub && !!auth.userId;
    return (
      <Page tone="night" wide>
        <div className={styles.desk}>
          <DeskHeader active="me" {...desk} />
          {overview ? body : <div className={styles.deskNarrow}>{bar}{body}</div>}
        </div>
      </Page>
    );
  }
  return (
    <Page tone="night" className={styles.page}>
      {bar}
      {body}
      <TabBar active="me" onOpen={onTab} />
    </Page>
  );
}
