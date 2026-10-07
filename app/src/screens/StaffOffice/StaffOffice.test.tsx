import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthState } from '../../services/auth/authContext';
import { AuthContext } from '../../services/auth/authContext';
import { fail, ok } from '../../services/result';

const sendMagicLink = vi.fn();
const setUsername = vi.fn();
vi.mock('../../services/repositories/auth', () => ({
  sendMagicLink: (e: string) => sendMagicLink(e), signInWithOAuth: vi.fn(() => Promise.resolve(ok(null))), signOut: vi.fn(),
}));
vi.mock('../../services/repositories/profiles', () => ({ setUsername: (...a: unknown[]) => setUsername(...a) }));
vi.mock('../../services/repositories/siteClears', () => ({ getAllTimeCount: () => Promise.resolve(ok(12)) }));
vi.mock('../../services/repositories/streaks', () => ({
  NO_STREAK: { current: 0, best: 0 }, getStreak: () => Promise.resolve(ok({ current: 3, best: 5 })),
}));
const listBadgesOf = vi.fn();
vi.mock('../../services/repositories/badges', () => ({ listBadgesOf: (...a: unknown[]) => listBadgesOf(...a) }));
vi.mock('../../services/repositories/leaderboards', () => ({
  getLeaderboard: () => Promise.resolve(ok([
    { user_id: 'me', username: 'meow', score: 40 }, { user_id: 'u2', username: 'zed', score: 25 },
  ])),
}));
vi.mock('../Crew/CrewScreen', () => ({ CrewScreen: () => <div>crew roster</div> }));

const { StaffOfficeScreen } = await import('./StaffOfficeScreen');

const auth = (over: Partial<AuthState> = {}): AuthState => ({
  ready: true, userId: null, email: null, username: '', handle: '', setHandle: vi.fn(), ...over,
});
const renderWith = (a: AuthState) => render(
  <AuthContext.Provider value={a}><StaffOfficeScreen onClose={() => {}} weeklyPerfect={3} /></AuthContext.Provider>);

beforeEach(() => { vi.clearAllMocks(); listBadgesOf.mockResolvedValue(ok([])); });

describe('Staff Office, signed out', () => {
  it('shows a loading note until the session is known', () => {
    renderWith(auth({ ready: false }));
    expect(screen.getByText(/CHECKING BADGE/)).toBeInTheDocument();
  });

  it('only lets a plausible email be sent', async () => {
    renderWith(auth());
    const send = screen.getByRole('button', { name: 'SEND PUNCH-IN LINK' });
    expect(send).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText('you@yourcompany.com'), 'ann@example.com');
    expect(send).toBeEnabled();
  });

  it('sends the link and confirms where it went', async () => {
    sendMagicLink.mockResolvedValue(ok(null));
    renderWith(auth());
    await userEvent.type(screen.getByPlaceholderText('you@yourcompany.com'), ' ann@example.com ');
    await userEvent.click(screen.getByRole('button', { name: 'SEND PUNCH-IN LINK' }));
    expect(sendMagicLink).toHaveBeenCalledWith('ann@example.com');
    expect(await screen.findByText('CHECK YOUR INBOX')).toBeInTheDocument();
    await userEvent.click(screen.getByText(/use a different email/));
    expect(screen.getByRole('button', { name: 'SEND PUNCH-IN LINK' })).toBeInTheDocument();
  });

  it('shows why a link could not be sent and lets you try again', async () => {
    sendMagicLink.mockResolvedValue(fail('rate limited'));
    renderWith(auth());
    await userEvent.type(screen.getByPlaceholderText('you@yourcompany.com'), 'ann@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'SEND PUNCH-IN LINK' }));
    expect(await screen.findByText('rate limited')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SEND PUNCH-IN LINK' })).toBeEnabled();
  });
});

describe('Staff Office, signed in', () => {
  const signedIn = () => auth({ userId: 'me', email: 'ann@example.com', username: 'meow', handle: '@meow' });

  it('shows the ID card, stats and leaderboard', async () => {
    renderWith(signedIn());
    expect(screen.getByText('@meow')).toBeInTheDocument();
    expect(screen.getByText('ann@example.com')).toBeInTheDocument();
    expect(screen.getByText('3/7')).toBeInTheDocument();
    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(await screen.findByText('DAY STREAK · BEST 5')).toBeInTheDocument();
    expect(screen.getByText('3', { selector: 'div' })).toBeInTheDocument();
    expect(await screen.findByText('@meow (YOU)')).toBeInTheDocument();
    expect(screen.getByText('@zed')).toBeInTheDocument();
  });

  it('renames the handle and tells the app', async () => {
    setUsername.mockResolvedValue(ok('newname'));
    const a = signedIn();
    renderWith(a);
    await userEvent.click(screen.getByRole('button', { name: 'EDIT' }));
    const input = screen.getByDisplayValue('meow');
    await userEvent.clear(input);
    await userEvent.type(input, 'newname');
    await userEvent.click(screen.getByRole('button', { name: 'SAVE' }));
    await waitFor(() => expect(a.setHandle).toHaveBeenCalledWith('newname'));
    expect(setUsername).toHaveBeenCalledWith('me', 'newname');
  });

  it('shows a rejected handle without leaving edit mode', async () => {
    setUsername.mockResolvedValue(fail('THAT HANDLE IS TAKEN.'));
    renderWith(signedIn());
    await userEvent.click(screen.getByRole('button', { name: 'EDIT' }));
    await userEvent.click(screen.getByRole('button', { name: 'SAVE' }));
    expect(await screen.findByText('THAT HANDLE IS TAKEN.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CANCEL' })).toBeInTheDocument();
  });

  it('shows the badges the server has awarded, in catalogue order', async () => {
    listBadgesOf.mockResolvedValue(ok([
      { id: 'first-duel-win', earnedAt: '2026-10-02T10:00:00Z' },
      { id: 'streak-7', earnedAt: '2026-10-01T10:00:00Z' },
    ]));
    renderWith(signedIn());
    expect(await screen.findByText('BADGES · 2')).toBeInTheDocument();
    const names = screen.getAllByRole('listitem').map(li => li.firstElementChild?.textContent);
    expect(names).toEqual(['WEEK ON THE JOB', 'FIRST BLOOD']);
    expect(listBadgesOf).toHaveBeenCalledWith('me');
  });

  it('says so when there are no badges yet', async () => {
    renderWith(signedIn());
    expect(await screen.findByText('NO BADGES YET')).toBeInTheDocument();
  });

  it('hides the shelf, and breaks nothing, when badges cannot be read', async () => {
    listBadgesOf.mockResolvedValue(fail('relation "player_badges" does not exist'));
    renderWith(signedIn());
    expect(await screen.findByText('12')).toBeInTheDocument();
    await waitFor(() => expect(listBadgesOf).toHaveBeenCalled());
    expect(screen.queryByText(/BADGES/)).not.toBeInTheDocument();
    expect(screen.getByText('@meow')).toBeInTheDocument();
  });

  it('opens the crew roster', async () => {
    renderWith(signedIn());
    await userEvent.click(screen.getByRole('button', { name: /CREW ROSTER/ }));
    expect(screen.getByText('crew roster')).toBeInTheDocument();
  });
});
