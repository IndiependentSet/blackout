import { describe, expect, it } from 'vitest';
import { hubCards, type HubInput } from './hubCards';

const base: HubInput = { signedIn: false, day: 12, perfect: 0, total: 7, campaignStat: 'CHAPTER 2 · LEVEL 3', survivalStat: null };
const byId = (input: HubInput, id: string) => hubCards(input).find(c => c.id === id)!;

describe('hubCards', () => {
  it('lists the four modes in order', () => {
    expect(hubCards(base).map(c => c.id)).toEqual(['daily', 'campaign', 'survival', 'match']);
  });

  it('shows the daily shift number and progress', () => {
    expect(byId(base, 'daily')).toMatchObject({ title: 'DAILY SHIFT #12', status: 'ready', stat: '0/7 PURR-FECT', cta: 'OPEN WORK ORDER' });
    expect(byId({ ...base, perfect: 7 }, 'daily').stat).toBe('7/7 PURR-FECT');
  });

  it('adds the daily streak to the daily card only when there is one', () => {
    expect(byId({ ...base, perfect: 3, streak: 4 }, 'daily').stat).toBe('3/7 PURR-FECT · 4-DAY STREAK');
    expect(byId({ ...base, perfect: 3, streak: 0 }, 'daily').stat).toBe('3/7 PURR-FECT');
  });

  it('asks an anonymous player to sign in for the campaign', () => {
    expect(byId(base, 'campaign')).toMatchObject({ status: 'signin', stat: null, cta: 'SIGN IN' });
  });

  it('opens the campaign for a signed-in player, at the level they have reached', () => {
    expect(byId({ ...base, signedIn: true }, 'campaign')).toMatchObject({ status: 'ready', stat: 'CHAPTER 2 · LEVEL 3', cta: 'PLAY CAMPAIGN' });
  });

  it('opens survival for everyone, with no stat until a run has banked a site', () => {
    for (const signedIn of [false, true]) {
      expect(byId({ ...base, signedIn }, 'survival')).toMatchObject({ status: 'ready', stat: null, cta: 'PLAY SURVIVAL' });
    }
  });

  it('shows the best survival run of the session on its card', () => {
    expect(byId({ ...base, survivalStat: 'BEST: 3 SITES · 41 PTS' }, 'survival').stat).toBe('BEST: 3 SITES · 41 PTS');
  });

  it('asks an anonymous player to sign in before 1vs1', () => {
    expect(byId(base, 'match')).toMatchObject({ status: 'signin', stat: null, cta: 'SIGN IN TO CHALLENGE' });
  });

  it('opens the 1vs1 lobby for a signed-in player', () => {
    expect(byId({ ...base, signedIn: true }, 'match')).toMatchObject({ status: 'ready', stat: null, cta: 'OPEN 1VS1 LOBBY' });
  });

  it('counts the challenges waiting for an answer, hiding them from an anonymous player', () => {
    expect(byId({ ...base, signedIn: true, challenges: 1 }, 'match').stat).toBe('1 CHALLENGE WAITING');
    expect(byId({ ...base, signedIn: true, challenges: 3 }, 'match').stat).toBe('3 CHALLENGES WAITING');
    expect(byId({ ...base, signedIn: false, challenges: 3 }, 'match').stat).toBeNull();
  });
});
