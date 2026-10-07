import { useCallback, useState } from 'react';
import { campaignHeadline, chapterOf, unlockedUpTo, type Chapter } from '../domain/campaign';
import { SITES } from '../domain/sites';
import { betterRun, survivalHeadline, type RunSummary } from '../domain/survival';
import { GameScreen } from '../game/GameScreen';
import { useCampaignClears } from '../game/hooks/useCampaignClears';
import { useIncomingChallenges } from '../game/hooks/useIncomingChallenges';
import { useStreak } from '../game/hooks/useStreak';
import { useSurvivalBest } from '../game/hooks/useSurvivalRanking';
import { LoadoutProvider } from '../game/loadout/LoadoutProvider';
import { useGameSession } from '../game/useGameSession';
import { CampaignPlay } from '../screens/Campaign/CampaignPlay';
import { CampaignScreen } from '../screens/Campaign/CampaignScreen';
import { HubScreen } from '../screens/Hub/HubScreen';
import { MatchLobby } from '../screens/Match/MatchLobby';
import { MatchScreen } from '../screens/Match/MatchScreen';
import { SurvivalScreen } from '../screens/Survival/SurvivalScreen';
import HowToPlay from '../screens/HowToPlay/HowToPlay';
import { StaffOfficeScreen } from '../screens/StaffOffice/StaffOfficeScreen';
import { WorkOrderScreen } from '../screens/WorkOrder/WorkOrderScreen';
import { perfectCount } from '../game/state/selectors';
import { AuthProvider } from '../services/auth/AuthProvider';
import { useAuth } from '../services/auth/authContext';
import { staffBadge } from './staffBadge';
import { useOrientation } from './useOrientation';

type Screen = 'hub' | 'workOrder' | 'game' | 'account' | 'campaign' | 'campaignPlay' | 'survival' | 'match' | 'matchPlay';

/* Which full-screen view is showing, and the state that has to outlive any of
   them (today's levels and the player's board, the campaign record) — held here, above all of them. */
function Shell() {
  const auth = useAuth();
  const session = useGameSession();
  const { clears, record, save: saveClear, persistence } = useCampaignClears(auth.userId);
  const [screen, setScreen] = useState<Screen>('hub');
  const streak = useStreak(auth.userId, screen === 'hub');
  const challenges = useIncomingChallenges(auth.userId, screen === 'hub');
  const [matchId, setMatchId] = useState<string | null>(null);
  const [challengeFriend, setChallengeFriend] = useState<string | null>(null);
  const [playing, setPlaying] = useState<{ chapter: Chapter; levelNo: number } | null>(null);
  const [survivalBest, setSurvivalBest] = useState<RunSummary | null>(null);
  const finishSurvival = useCallback((run: RunSummary) => setSurvivalBest(best => betterRun(best, run)), []);
  const survivalRecord = useSurvivalBest(auth.userId, survivalBest);
  const [accountFrom, setAccountFrom] = useState<Exclude<Screen, 'account'>>('hub');
  const orientation = useOrientation({ ready: auth.ready, signedIn: !!auth.userId, onEntry: screen === 'hub' });

  const badge = staffBadge(auth, session.state.results);
  const openAccount = (from: Exclude<Screen, 'account'>) => { setAccountFrom(from); setScreen('account'); };

  if (screen === 'account') {
    return (
      <StaffOfficeScreen onClose={() => setScreen(accountFrom)} weeklyPerfect={perfectCount(session.state.results)}
        onChallenge={friendId => { setChallengeFriend(friendId); setScreen('match'); }} />
    );
  }

  if (screen === 'campaign') {
    const openLevel = (levelNo: number) => {
      const chapter = chapterOf(levelNo);
      if (!chapter || persistence === 'loading' || levelNo > unlockedUpTo(clears)) return;
      setPlaying({ chapter, levelNo });
      setScreen('campaignPlay');
    };
    return (
      <CampaignScreen signedIn={!!auth.userId} clears={clears} persistence={persistence} badge={badge} onOpenLevel={openLevel}
        onOpenAccount={() => openAccount('campaign')} onBack={() => setScreen('hub')} />
    );
  }

  if (screen === 'campaignPlay' && playing) {
    return (
      <CampaignPlay chapter={playing.chapter} startLevelNo={playing.levelNo} clears={clears} record={record} saveClear={saveClear}
        userId={auth.userId} badge={badge} onOpenAccount={() => openAccount('campaign')} onOpenHub={() => setScreen('hub')} />
    );
  }

  if (screen === 'survival') {
    return (
      <SurvivalScreen userId={auth.userId} badge={badge} best={survivalBest} onFinish={finishSurvival}
        onOpenAccount={() => openAccount('survival')} onOpenHub={() => setScreen('hub')} />
    );
  }

  if (screen === 'match' && auth.userId) {
    return (
      <MatchLobby userId={auth.userId} preselect={challengeFriend}
        onOpenMatch={id => { setMatchId(id); setScreen('matchPlay'); }}
        onBack={() => { setChallengeFriend(null); setScreen('hub'); }} />
    );
  }

  if (screen === 'matchPlay' && matchId && auth.userId) {
    return (
      <MatchScreen key={matchId} matchId={matchId} userId={auth.userId} badge={badge}
        onOpenAccount={() => openAccount('matchPlay')} onOpenLobby={() => setScreen('match')} onOpenHub={() => setScreen('hub')} />
    );
  }

  if (screen === 'game') {
    return (
      <GameScreen session={session} userId={auth.userId} badge={badge}
        onOpenAccount={() => openAccount('game')} onOpenWorkOrder={() => setScreen('workOrder')} onOpenHub={() => setScreen('hub')} />
    );
  }

  const overlay = orientation.open && (
    <HowToPlay sites={SITES} onClose={orientation.hide} onStart={() => { orientation.hide(); setScreen('game'); }} />
  );

  if (screen === 'workOrder') {
    return (
      <>
        <WorkOrderScreen day={session.day} siteNo={session.state.idx + 1} badge={badge} keysEnabled={!orientation.open}
          onClockIn={() => setScreen('game')} onHowItWorks={orientation.show} onOpenAccount={() => openAccount('workOrder')}
          onBack={() => setScreen('hub')} />
        {overlay}
      </>
    );
  }

  return (
    <>
      <HubScreen day={session.day} perfect={perfectCount(session.state.results)} total={session.set.count}
        signedIn={!!auth.userId} badge={badge} streak={streak.current} challenges={challenges}
        onOpenDaily={() => setScreen('workOrder')}
        campaignStat={campaignHeadline(clears)} onOpenCampaign={() => setScreen('campaign')}
        survivalStat={survivalHeadline(survivalRecord)} onOpenSurvival={() => setScreen('survival')}
        onOpenMatch={() => { setChallengeFriend(null); setScreen('match'); }}
        onOpenAccount={() => openAccount('hub')} onHowItWorks={orientation.show} />
      {overlay}
    </>
  );
}

export default function App() {
  return <AuthProvider><LoadoutProvider><Shell /></LoadoutProvider></AuthProvider>;
}
