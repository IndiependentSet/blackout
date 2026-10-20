export type HubCardId = 'daily' | 'campaign' | 'survival' | 'match';

/** ready: playable now · signin: needs a staff login first · soon: not built yet */
export type HubCardStatus = 'ready' | 'signin' | 'soon';

export interface HubCard {
  id: HubCardId;
  title: string;
  blurb: string;
  status: HubCardStatus;
  /** the card's headline number or place, null when there is nothing to show yet */
  stat: string | null;
  /** button label, null when the card cannot be opened */
  cta: string | null;
}

export interface HubInput {
  signedIn: boolean;
  day: number;
  perfect: number;
  total: number;
  /** where the campaign stands, e.g. "CHAPTER 2 · LEVEL 3" */
  campaignStat: string;
  /** the best survival run this session, null until a site has been flattened */
  survivalStat: string | null;
  /** days in a row with a clear; 0 or missing shows nothing */
  streak?: number;
  /** 1vs1 challenges waiting for this player's answer; 0 or missing shows nothing */
  challenges?: number;
}

/** What each dashboard card shows and whether it can be opened, derived from who is playing. */
export function hubCards({ signedIn, day, perfect, total, campaignStat, survivalStat, streak = 0, challenges = 0 }: HubInput): HubCard[] {
  return [
    {
      id: 'daily', title: `DAILY SHIFT #${day}`,
      blurb: `${total} sites, the same for every cat wrangler today.`,
      status: 'ready', stat: `${perfect}/${total} PURR-FECT` + (streak > 0 ? ` · ${streak}-DAY STREAK` : ''), cta: 'OPEN WORK ORDER',
    },
    {
      id: 'campaign', title: 'CAMPAIGN',
      blurb: 'A hundred jobs, easy ones first. Staff login required.',
      status: signedIn ? 'ready' : 'signin', stat: signedIn ? campaignStat : null,
      cta: signedIn ? 'PLAY CAMPAIGN' : 'SIGN IN',
    },
    {
      id: 'survival', title: 'SURVIVAL',
      blurb: 'Flatten as many sites as you can before the clock runs out.',
      status: 'ready', stat: survivalStat, cta: 'PLAY SURVIVAL',
    },
    {
      id: 'match', title: '1VS1',
      blurb: 'Same house, two crews, one winner. Challenge a friend live. Staff login required.',
      status: signedIn ? 'ready' : 'signin',
      stat: signedIn && challenges > 0 ? `${challenges} ${challenges === 1 ? 'CHALLENGE' : 'CHALLENGES'} WAITING` : null,
      cta: signedIn ? 'OPEN 1VS1 LOBBY' : 'SIGN IN TO CHALLENGE',
    },
  ];
}
