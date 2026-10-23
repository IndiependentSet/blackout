import { useState } from 'react';
import { CHAPTERS, chapterOf, chapterProgress, unlockedUpTo, type Chapter } from '../../domain/campaign';
import { initial } from '../../domain/profile';
import type { BoardKind } from '../../domain/ranking';
import { useMyPlace } from '../../game/hooks/useBoard';
import { useChallenge } from '../../game/match/useChallenge';
import { useIncomingChallenges } from '../../game/hooks/useIncomingChallenges';
import { useNights } from '../../game/hooks/useNights';
import { useSkyNames } from '../../game/hooks/useSkyNames';
import { useStreak } from '../../game/hooks/useStreak';
import type { AppState } from '../../game/useAppState';
import { useOrientation } from '../../game/useOrientation';
import type { Tab } from './kit/TabBar';
import { skyEntries } from './play/sky';
import { monthOf, planetOf, plural, weekOf } from './copy';
import { AtlasScreen } from './screens/Atlas/AtlasScreen';
import { BoardScreen } from './screens/Board/BoardScreen';
import { DuelLobby } from './screens/Duel/DuelLobby';
import { DuelScreen } from './screens/Duel/DuelScreen';
import { FirstNightScreen } from './screens/FirstNight/FirstNightScreen';
import { ObservatoryScreen } from './screens/Observatory/ObservatoryScreen';
import { RushScreen } from './screens/Rush/RushScreen';
import { StatsScreen } from './screens/Stats/StatsScreen';
import { DailySky } from './screens/Sky/DailySky';
import { NightChartedScreen } from './screens/Sky/NightChartedScreen';
import { TonightScreen } from './screens/Tonight/TonightScreen';
import { previewLevel, tonightState } from './screens/Tonight/tonight';
import { VoyagePlay } from './screens/Voyage/VoyagePlay';
import { VoyageScreen } from './screens/Voyage/VoyageScreen';

type Route = 'tonight' | 'sky' | 'charted' | 'atlas' | 'me' | 'voyage' | 'voyagePlay' | 'rush' | 'duel' | 'duelPlay' | 'board' | 'stats';

/** what Back reads on a board page opened from each page */
const BACK_LABEL: Partial<Record<Route, string>> = { tonight: 'Tonight', charted: 'Night charted', voyage: 'Voyage', duel: 'Star Duel', stats: 'Stats' };

interface Props {
  app: AppState;
  /** the hidden way to the old CATASTROPHE INC. look (seven taps on the title) */
  onSecret: () => void;
}

/* Stargazer: which page is showing. The state every page shares (tonight's board, the voyage record, the best
   Meteor Rush) comes from the app shell, so it is the same board the CATASTROPHE INC. look plays. */
export function StargazerApp({ app, onSecret }: Props) {
  const { auth, session, campaign, survivalBest, finishSurvival, survivalRecord } = app;
  const { userId } = auth;
  const [route, setRoute] = useState<Route>('tonight');
  const [playing, setPlaying] = useState<{ chapter: Chapter; levelNo: number } | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [duelWith, setDuelWith] = useState<string | null>(null);
  /** a board page open from `from`: which boards it offers, and the page its Back returns to */
  const [boardAt, setBoardAt] = useState<{ kinds: BoardKind[]; from: Route }>({ kinds: ['night', 'week', 'alltime'], from: 'tonight' });
  const openBoard = (kinds: BoardKind[], from: Route) => { setBoardAt({ kinds, from }); setRoute('board'); };
  const challenger = useChallenge();
  const ladder = boardAt.kinds.includes('duel');
  const home = route === 'tonight' || route === 'me' || route === 'charted';
  const streak = useStreak(userId, home);
  const challenges = useIncomingChallenges(userId, route === 'tonight');
  const atlas = useSkyNames(userId);
  const orientation = useOrientation({ ready: auth.ready, signedIn: !!userId, onEntry: route === 'tonight' });

  const day = session.day;
  const results = session.state.results;
  const week = weekOf(day);
  const month = monthOf(day);
  const nights = useNights(userId, Math.min(week[0].day, month.days[0]), Math.max(week[6].day, month.days[month.days.length - 1]), day, results);

  const tab = (t: Tab) => setRoute(t === 'tonight' ? 'tonight' : t === 'atlas' ? 'atlas' : 'me');
  const signIn = () => setRoute('me');
  const tonight = tonightState(results, session.state.idx);
  const nightPlace = useMyPlace('night', userId, { day, enabled: (route === 'tonight' || route === 'charted') && tonight.charted > 0, refresh: String(tonight.charted) });
  const voyagePlace = useMyPlace('voyage', userId, { enabled: route === 'voyage', refresh: String(campaign.clears.size) });
  const openSky = () => {
    if (tonight.done) return setRoute('charted');
    if (tonight.next !== session.state.idx && session.levels[tonight.next]) session.dispatch({ type: 'go', idx: tonight.next });
    setRoute('sky');
  };

  if (orientation.open) {
    return <FirstNightScreen onStart={() => { orientation.hide(); openSky(); }} onClose={orientation.hide} />;
  }

  switch (route) {
    case 'sky':
      return <DailySky session={session} userId={userId} onBack={() => setRoute('tonight')} onNightDone={() => setRoute('charted')} />;

    case 'charted':
      return (
        <NightChartedScreen day={day} results={results} figure={session.levels[session.levels.length - 1] ?? null}
          streak={streak.current} signedIn={!!userId} atlas={atlas} place={nightPlace} onBoard={() => openBoard(['night', 'week', 'alltime'], 'charted')}
          onSaved={() => setRoute('atlas')} onSignIn={signIn} onBack={() => setRoute('tonight')} />
      );

    case 'atlas':
      return <AtlasScreen today={day} signedIn={!!userId} atlas={atlas} onTab={tab} onSignIn={signIn} onTonight={() => setRoute('tonight')} />;

    case 'me':
      return (
        <ObservatoryScreen auth={auth} today={day} month={nights} streak={streak.current} named={atlas.names.length}
          onTab={tab} onDuel={id => { setDuelWith(id); setRoute('duel'); }} onStats={() => setRoute('stats')} onHowTo={orientation.show} />
      );

    case 'voyage':
      return (
        <VoyageScreen signedIn={!!userId} clears={campaign.clears} persistence={campaign.persistence} onSignIn={signIn}
          place={voyagePlace} onBoard={() => openBoard(['voyage'], 'voyage')}
          onBack={() => setRoute('tonight')}
          onOpenLevel={levelNo => {
            const chapter = chapterOf(levelNo);
            if (!chapter || campaign.persistence === 'loading' || levelNo > unlockedUpTo(campaign.clears)) return;
            setPlaying({ chapter, levelNo });
            setRoute('voyagePlay');
          }} />
      );

    case 'voyagePlay':
      if (!playing) break;
      return (
        <VoyagePlay key={playing.chapter.index + ':' + playing.levelNo} chapter={playing.chapter} startLevelNo={playing.levelNo}
          clears={campaign.clears} record={campaign.record} saveClear={campaign.save} userId={userId} onBack={() => setRoute('voyage')} />
      );

    case 'stats':
      return <StatsScreen userId={userId} today={day} onBoard={kinds => openBoard(kinds, 'stats')} onSignIn={signIn} onBack={() => setRoute('me')} />;

    case 'board':
      return (
        <BoardScreen kinds={boardAt.kinds} userId={userId} day={day} backLabel={BACK_LABEL[boardAt.from] ?? 'Back'} onBack={() => setRoute(boardAt.from)} onSignIn={signIn}
          onChallenge={ladder ? id => { challenger.challenge(id).then(m => { if (m) { setMatchId(m); setRoute('duelPlay'); } }); } : undefined}
          challengeBusy={challenger.busy} challengeError={ladder ? challenger.error : null}
          onFindRanked={ladder ? () => setRoute('duel') : undefined} />
      );

    case 'rush':
      return <RushScreen userId={userId} best={survivalBest} onFinish={finishSurvival} onSignIn={signIn} onBack={() => setRoute('tonight')} />;

    case 'duel':
      if (!userId) break;
      return (
        <DuelLobby userId={userId} preselect={duelWith} onBack={() => { setDuelWith(null); setRoute('tonight'); }}
          onOpenMatch={id => { setMatchId(id); setRoute('duelPlay'); }} onLadder={() => openBoard(['duel', 'season'], 'duel')} />
      );

    case 'duelPlay':
      if (!userId || !matchId) break;
      return (
        <DuelScreen key={matchId} matchId={matchId} userId={userId} initial={initial({ username: auth.username })} avatar={auth.avatar}
          onOpenLobby={() => setRoute('duel')} onOpenHub={() => setRoute('tonight')} />
      );
  }

  /* ---- Tonight ---- */
  const reach = chapterOf(unlockedUpTo(campaign.clears)) ?? CHAPTERS[0];
  const progress = chapterProgress(campaign.clears, reach);
  const planet = planetOf(reach.index);
  const levelInWorld = unlockedUpTo(campaign.clears) - reach.from + 1;
  return (
    <TonightScreen day={day} tonight={tonight} skies={skyEntries(results, tonight.done ? -1 : tonight.next)}
      preview={previewLevel(session.levels, tonight)} streak={streak.current} week={nights}
      initial={initial({ username: auth.username }) || '?'} avatar={auth.avatar}
      voyage={{
        planet: planet.name, art: planet.art,
        stat: userId ? `${planet.name} ${progress.cleared}/${progress.total}` : 'Sign in to fly',
        action: userId ? `Fly to ${levelInWorld}` : 'Sign in', onOpen: () => setRoute('voyage'),
      }}
      rush={{ stat: survivalRecord && survivalRecord.sites > 0 ? `Best ${plural(survivalRecord.sites, 'sky', 'skies')}` : null, action: 'Play', onOpen: () => setRoute('rush') }}
      duel={{
        stat: !userId ? 'Sign in to duel' : challenges > 0 ? `${challenges} waiting` : null, waiting: challenges > 0,
        action: !userId ? 'Sign in' : challenges > 0 ? 'Answer' : 'Open', onOpen: () => setRoute(userId ? 'duel' : 'me'),
      }}
      place={nightPlace} onBoard={() => openBoard(['night', 'week', 'alltime'], 'tonight')}
      onContinue={openSky} onTab={tab} onSecret={onSecret} />
  );
}
