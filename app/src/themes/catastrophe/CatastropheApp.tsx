import { useState } from 'react';
import { campaignHeadline, chapterOf, unlockedUpTo, type Chapter } from '../../domain/campaign';
import { SITES } from '../../domain/sites';
import { survivalHeadline } from '../../domain/survival';
import { useIncomingChallenges } from '../../game/hooks/useIncomingChallenges';
import { useStreak } from '../../game/hooks/useStreak';
import { perfectCount } from '../../game/state/selectors';
import type { AppState } from '../../game/useAppState';
import { useOrientation } from '../../game/useOrientation';
import { GameScreen } from './game/GameScreen';
import { CampaignPlay } from './screens/Campaign/CampaignPlay';
import { CampaignScreen } from './screens/Campaign/CampaignScreen';
import { HubScreen } from './screens/Hub/HubScreen';
import HowToPlay from './screens/HowToPlay/HowToPlay';
import { MatchLobby } from './screens/Match/MatchLobby';
import { MatchScreen } from './screens/Match/MatchScreen';
import { StaffOfficeScreen } from './screens/StaffOffice/StaffOfficeScreen';
import { SurvivalScreen } from './screens/Survival/SurvivalScreen';
import { WorkOrderScreen } from './screens/WorkOrder/WorkOrderScreen';
import { SkinSwitch } from './SkinSwitch';
import { staffBadge } from './staffBadge';

type Screen = 'hub' | 'workOrder' | 'game' | 'account' | 'campaign' | 'campaignPlay' | 'survival' | 'match' | 'matchPlay';

interface Props {
  app: AppState;
  /** back to the Stargazer look, with the same board and progress */
  onLeave: () => void;
}

/* CATASTROPHE INC.: which full-screen view is showing. The state every screen shares (today's board, the campaign
   record, the best survival run) is held above, in the app shell, so it survives a switch of theme. */
export function CatastropheApp({ app, onLeave }: Props) {
  const { auth, session, campaign, survivalBest, finishSurvival, survivalRecord } = app;
  const { clears, record, save: saveClear, persistence } = campaign;
  const [screen, setScreen] = useState<Screen>('hub');
  const streak = useStreak(auth.userId, screen === 'hub');
  const challenges = useIncomingChallenges(auth.userId, screen === 'hub');
  const [matchId, setMatchId] = useState<string | null>(null);
  const [challengeFriend, setChallengeFriend] = useState<string | null>(null);
  const [playing, setPlaying] = useState<{ chapter: Chapter; levelNo: number } | null>(null);
  const [accountFrom, setAccountFrom] = useState<Exclude<Screen, 'account'>>('hub');
  const orientation = useOrientation({ ready: auth.ready, signedIn: !!auth.userId, onEntry: screen === 'hub' });

  const badge = staffBadge(auth, session.state.results);
  const openAccount = (from: Exclude<Screen, 'account'>) => { setAccountFrom(from); setScreen('account'); };
  const way = <SkinSwitch onSwitch={onLeave} />;

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
      <>
        <GameScreen session={session} userId={auth.userId} badge={badge}
          onOpenAccount={() => openAccount('game')} onOpenWorkOrder={() => setScreen('workOrder')} onOpenHub={() => setScreen('hub')} />
        {way}
      </>
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
      {!orientation.open && way}
    </>
  );
}
