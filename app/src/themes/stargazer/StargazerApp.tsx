import { useState } from 'react';
import { CHAPTERS, chapterOf, chapterProgress, unlockedUpTo, type Chapter } from '../../domain/campaign';
import { initial } from '../../domain/profile';
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
import { DuelLobby } from './screens/Duel/DuelLobby';
import { DuelScreen } from './screens/Duel/DuelScreen';
import { FirstNightScreen } from './screens/FirstNight/FirstNightScreen';
import { ObservatoryScreen } from './screens/Observatory/ObservatoryScreen';
import { RushScreen } from './screens/Rush/RushScreen';
import { DailySky } from './screens/Sky/DailySky';
import { NightChartedScreen } from './screens/Sky/NightChartedScreen';
import { TonightScreen } from './screens/Tonight/TonightScreen';
import { previewLevel, tonightState } from './screens/Tonight/tonight';
import { VoyagePlay } from './screens/Voyage/VoyagePlay';
import { VoyageScreen } from './screens/Voyage/VoyageScreen';

type Route = 'tonight' | 'sky' | 'charted' | 'atlas' | 'me' | 'voyage' | 'voyagePlay' | 'rush' | 'duel' | 'duelPlay';

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
          streak={streak.current} signedIn={!!userId} atlas={atlas}
          onSaved={() => setRoute('atlas')} onSignIn={signIn} onBack={() => setRoute('tonight')} />
      );

    case 'atlas':
      return <AtlasScreen today={day} signedIn={!!userId} atlas={atlas} onTab={tab} onSignIn={signIn} onTonight={() => setRoute('tonight')} />;

    case 'me':
      return (
        <ObservatoryScreen auth={auth} today={day} month={nights} streak={streak.current} named={atlas.names.length}
          onTab={tab} onDuel={id => { setDuelWith(id); setRoute('duel'); }} onHowTo={orientation.show} />
      );

    case 'voyage':
      return (
        <VoyageScreen signedIn={!!userId} clears={campaign.clears} persistence={campaign.persistence} onSignIn={signIn}
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

    case 'rush':
      return <RushScreen userId={userId} best={survivalBest} onFinish={finishSurvival} onBack={() => setRoute('tonight')} />;

    case 'duel':
      if (!userId) break;
      return (
        <DuelLobby userId={userId} preselect={duelWith} onBack={() => { setDuelWith(null); setRoute('tonight'); }}
          onOpenMatch={id => { setMatchId(id); setRoute('duelPlay'); }} />
      );

    case 'duelPlay':
      if (!userId || !matchId) break;
      return (
        <DuelScreen key={matchId} matchId={matchId} userId={userId} initial={initial({ username: auth.username })}
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
      initial={initial({ username: auth.username }) || '?'}
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
      onContinue={openSky} onTab={tab} onSecret={onSecret} />
  );
}
