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
vi.mock('../../services/repositories/leaderboards', () => ({
  getLeaderboard: () => Promise.resolve(ok([
    { user_id: 'me', username: 'meow', score: 40 }, { user_id: 'u2', username: 'zed', score: 25 },
  ])),
}));
const isAdmin = vi.fn(() => Promise.resolve(ok<boolean>(false)));
vi.mock('../../services/repositories/admin', () => ({ isAdmin: () => isAdmin() }));
vi.mock('../Crew/CrewScreen', () => ({ CrewScreen: () => <div>crew roster</div> }));

const { StaffOfficeScreen } = await import('./StaffOfficeScreen');

const auth = (over: Partial<AuthState> = {}): AuthState => ({
  ready: true, userId: null, email: null, username: '', handle: '', setHandle: vi.fn(), ...over,
});
const renderWith = (a: AuthState) => render(
  <AuthContext.Provider value={a}><StaffOfficeScreen onClose={() => {}} weeklyPerfect={3} /></AuthContext.Provider>);

beforeEach(() => { vi.clearAllMocks(); });

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

  it('opens the crew roster', async () => {
    renderWith(signedIn());
    await userEvent.click(screen.getByRole('button', { name: /CREW ROSTER/ }));
    expect(screen.getByText('crew roster')).toBeInTheDocument();
  });

  it('offers the admin tools only to an admin', async () => {
    renderWith(signedIn());
    await screen.findByText('@meow (YOU)');
    expect(screen.queryByRole('button', { name: /ADMIN TOOLS/ })).toBeNull();
    isAdmin.mockResolvedValueOnce(ok(true));
    renderWith(auth({ userId: 'boss', email: 'b@example.com', username: 'boss', handle: '@boss' }));
    expect(await screen.findByRole('button', { name: /ADMIN TOOLS/ })).toBeInTheDocument();
  });
});
